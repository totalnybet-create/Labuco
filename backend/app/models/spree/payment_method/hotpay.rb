# frozen_string_literal: true

require 'digest'
require 'json'
require 'net/http'
require 'securerandom'
require 'uri'

module Spree
  class PaymentMethod::Hotpay < ::Spree::PaymentMethod
    PAYMENT_URL = 'https://platnosc.hotpay.pl/'

    preference :secret, :password
    preference :notification_password, :password
    preference :enforce_ip_whitelist, :boolean, default: true

    validates :preferred_secret, :preferred_notification_password, presence: true

    def default_name
      'BLIK / szybki przelew (HotPay)'
    end

    def method_type
      'hotpay'
    end

    def payment_icon_name
      'hotpay'
    end

    def source_required?
      false
    end

    def session_required?
      true
    end

    def payment_session_class
      Spree::PaymentSessions::Hotpay
    end

    def available_for_order?(order)
      super && order.currency.to_s.upcase == 'PLN'
    end

    def create_payment_session(order:, amount: nil, external_data: {})
      total = BigDecimal((amount.presence || order.total_minus_store_credits).to_s)
      external_id = build_external_id(order)
      return_url = normalized_return_url(external_data['return_url'] || external_data[:return_url])
      payment_url = initialize_hotpay_payment!(
        order: order,
        amount: total,
        external_id: external_id,
        return_url: return_url
      )

      payment_sessions.create!(
        order: order,
        amount: total,
        currency: order.currency,
        external_id: external_id,
        external_data: {
          'payment_url' => payment_url,
          'return_url' => return_url
        },
        customer: order.customer
      )
    end

    def update_payment_session(payment_session:, amount: nil, external_data: {})
      total = BigDecimal((amount.presence || payment_session.amount).to_s)
      return_url = normalized_return_url(
        external_data['return_url'] || external_data[:return_url] || payment_session.external_data['return_url']
      )
      external_id = build_external_id(payment_session.owner)
      payment_url = initialize_hotpay_payment!(
        order: payment_session.owner,
        amount: total,
        external_id: external_id,
        return_url: return_url
      )

      payment_session.update!(
        amount: total,
        external_id: external_id,
        external_data: payment_session.external_data.merge(
          'payment_url' => payment_url,
          'return_url' => return_url
        )
      )
      payment_session
    end

    # HotPay is an off-site redirect gateway. A browser return is not proof of
    # payment, so client-triggered session completion always fails closed.
    # Only the signed HotPay notification handled by HotpayWebhooksController
    # is allowed to settle the session.
    def complete_payment_session(payment_session:, params: {})
      payment_session.errors.add(:base, 'HotPay payment is awaiting signed provider confirmation')
      payment_session
    end

    def webhook_url
      return nil unless store

      base = if store.respond_to?(:formatted_url)
               store.formatted_url
             else
               store.url_or_custom_domain
             end
      "#{base.to_s.delete_suffix('/')}/payments/hotpay/webhook"
    end

    private

    def build_external_id(order)
      order_number = order.respond_to?(:number) ? order.number : order.id
      "labuco-#{order_number}-#{SecureRandom.hex(6)}".first(64)
    end

    def normalized_return_url(raw_url)
      return '' if raw_url.blank?

      uri = URI.parse(raw_url.to_s)
      return raw_url.to_s unless %w[http https].include?(uri.scheme)

      query = URI.decode_www_form(uri.query.to_s)
      query.reject! { |key, _value| key == 'hotpay' }
      query << ['hotpay', '1']
      uri.query = URI.encode_www_form(query)
      uri.to_s
    rescue URI::InvalidURIError
      raw_url.to_s
    end

    def initialize_hotpay_payment!(order:, amount:, external_id:, return_url:)
      amount_string = format('%.2f', amount)
      service_name = "LABUCO #{order.respond_to?(:number) ? order.number : external_id}"
      fields = {
        'SEKRET' => preferred_secret.to_s,
        'KWOTA' => amount_string,
        'NAZWA_USLUGI' => service_name,
        'ADRES_WWW' => return_url.to_s,
        'ID_ZAMOWIENIA' => external_id,
        'EMAIL' => order.respond_to?(:email) ? order.email.to_s : '',
        'DANE_OSOBOWE' => '',
        'TYP' => 'INIT'
      }
      fields['HASH'] = Digest::SHA256.hexdigest([
        preferred_notification_password.to_s,
        fields['KWOTA'],
        fields['NAZWA_USLUGI'],
        fields['ADRES_WWW'],
        fields['ID_ZAMOWIENIA'],
        fields['SEKRET']
      ].join(';'))

      uri = URI(PAYMENT_URL)
      request = Net::HTTP::Post.new(uri)
      request.set_form(fields.to_a, 'multipart/form-data')

      response = Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: true,
        open_timeout: 8,
        read_timeout: 12
      ) { |http| http.request(request) }

      raise Spree::Core::GatewayError, "HotPay initialization failed (HTTP #{response.code})" unless response.is_a?(Net::HTTPSuccess)

      payload = JSON.parse(response.body)
      payment_url = payload['URL'].to_s
      unless payload['STATUS'] == true && safe_hotpay_url?(payment_url)
        message = payload['WIADOMOSC'].presence || 'HotPay did not return a valid payment URL'
        raise Spree::Core::GatewayError, message
      end

      payment_url
    rescue JSON::ParserError, SocketError, SystemCallError, Timeout::Error, URI::InvalidURIError => e
      raise Spree::Core::GatewayError, "HotPay initialization error: #{e.message}"
    end

    def safe_hotpay_url?(value)
      uri = URI.parse(value)
      uri.scheme == 'https' && (uri.host == 'hotpay.pl' || uri.host.to_s.end_with?('.hotpay.pl'))
    rescue URI::InvalidURIError
      false
    end
  end
end
