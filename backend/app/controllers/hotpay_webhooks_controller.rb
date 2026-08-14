# frozen_string_literal: true

require 'bigdecimal'
require 'digest'

class HotpayWebhooksController < ActionController::API
  HOTPAY_SOURCE_IPS = %w[
    18.197.55.26
    3.126.108.86
    3.64.128.101
    18.184.99.42
    3.72.152.155
    35.159.7.168
  ].freeze

  def create
    payload = request.request_parameters.to_h.stringify_keys
    payment_method = find_payment_method(payload['SEKRET'].to_s)
    return head :unauthorized unless payment_method
    return head :forbidden unless source_ip_allowed?(payment_method)

    required = %w[SEKRET KWOTA STATUS ID_ZAMOWIENIA ID_PLATNOSCI SECURE HASH]
    return head :bad_request unless required.all? { |key| payload[key].present? }

    expected_hash = Digest::SHA256.hexdigest([
      payment_method.preferred_notification_password.to_s,
      payload['KWOTA'],
      payload['ID_PLATNOSCI'],
      payload['ID_ZAMOWIENIA'],
      payload['STATUS'],
      payload['SECURE'],
      payload['SEKRET']
    ].join(';'))
    return head :unauthorized unless secure_equal?(expected_hash, payload['HASH'].to_s.downcase)

    payment_session = Spree::PaymentSession.find_by(
      payment_method: payment_method,
      external_id: payload['ID_ZAMOWIENIA']
    )
    return head :not_found unless payment_session

    callback_amount = BigDecimal(payload['KWOTA'].to_s)
    return head :unprocessable_entity unless callback_amount == BigDecimal(payment_session.amount.to_s)

    payment_session.update!(
      external_data: payment_session.external_data.merge(
        'hotpay_payment_id' => payload['ID_PLATNOSCI'],
        'hotpay_secure' => payload['SECURE'],
        'hotpay_status' => payload['STATUS']
      )
    )

    case payload['STATUS']
    when 'SUCCESS'
      enqueue(payment_method, payment_session, :captured)
    when 'FAILURE'
      enqueue(payment_method, payment_session, :failed)
    when 'PENDING'
      # Keep the payment session pending. HotPay may send a later terminal status.
    else
      return head :unprocessable_entity
    end

    head :ok
  rescue ArgumentError
    head :unprocessable_entity
  end

  private

  def find_payment_method(secret)
    return nil if secret.blank?

    Spree::PaymentMethod::Hotpay.active.detect do |method|
      secure_equal?(method.preferred_secret.to_s, secret)
    end
  end

  def source_ip_allowed?(payment_method)
    return true unless payment_method.preferred_enforce_ip_whitelist

    HOTPAY_SOURCE_IPS.include?(request.remote_ip.to_s)
  end

  def secure_equal?(left, right)
    return false if left.blank? || right.blank?

    ActiveSupport::SecurityUtils.secure_compare(
      Digest::SHA256.hexdigest(left.to_s),
      Digest::SHA256.hexdigest(right.to_s)
    )
  end

  def enqueue(payment_method, payment_session, action)
    Spree::Payments::HandleWebhookJob.perform_later(
      payment_method_id: payment_method.id,
      action: action,
      payment_session_id: payment_session.id
    )
  end
end
