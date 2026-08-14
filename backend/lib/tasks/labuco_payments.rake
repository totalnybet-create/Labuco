# frozen_string_literal: true

namespace :labuco do
  namespace :payments do
    desc 'Idempotently configure LABUCO HotPay, PayPal and bank transfer methods'
    task configure: :environment do
      store = Spree::Store.default
      raise 'Default Spree store is missing' unless store

      bank_account = ENV.fetch('LABUCO_BANK_ACCOUNT', 'PL88 1050 1748 1000 0098 5745 4228').to_s.strip
      bank = Spree::PaymentMethod::Check.where(name: 'Przelew bankowy').first_or_initialize
      bank.assign_attributes(
        active: true,
        display_on: 'both',
        capture_method: 'manual',
        store: store,
        description: "Wpłać na rachunek #{bank_account}. W tytule przelewu podaj numer zamówienia. Realizacja rozpocznie się po zaksięgowaniu wpłaty."
      )
      bank.save!
      puts "LABUCO bank transfer configured: id=#{bank.id}"

      hotpay_secret = ENV['HOTPAY_SECRET'].to_s.strip
      hotpay_password = ENV['HOTPAY_NOTIFICATION_PASSWORD'].to_s.strip
      if hotpay_secret.empty? && hotpay_password.empty?
        puts 'LABUCO HotPay bootstrap skipped (credentials are not configured)'
      elsif hotpay_secret.empty? || hotpay_password.empty?
        raise 'HOTPAY_SECRET and HOTPAY_NOTIFICATION_PASSWORD must be configured together'
      else
        enforce_ip = ActiveModel::Type::Boolean.new.cast(
          ENV.fetch('HOTPAY_ENFORCE_IP_WHITELIST', 'true')
        )
        hotpay = Spree::PaymentMethod::Hotpay.where(name: 'BLIK / szybki przelew (HotPay)').first_or_initialize
        hotpay.assign_attributes(
          active: true,
          display_on: 'both',
          capture_method: 'checkout',
          store: store,
          description: 'BLIK i szybkie przelewy bankowe obsługiwane przez HotPay.',
          preferences: {
            secret: hotpay_secret,
            notification_password: hotpay_password,
            enforce_ip_whitelist: enforce_ip
          }
        )
        hotpay.save!(validate: false)
        puts "LABUCO HotPay configured: id=#{hotpay.id}, webhook=#{hotpay.webhook_url}"
      end

      paypal_client_id = ENV['PAYPAL_CLIENT_ID'].to_s.strip
      paypal_client_secret = ENV['PAYPAL_CLIENT_SECRET'].to_s.strip
      if paypal_client_id.empty? && paypal_client_secret.empty?
        puts 'LABUCO PayPal bootstrap skipped (credentials are not configured)'
      elsif paypal_client_id.empty? || paypal_client_secret.empty?
        raise 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured together'
      else
        paypal = SpreePaypalCheckout::Gateway.where(name: 'PayPal').first_or_initialize
        paypal.assign_attributes(
          active: true,
          display_on: 'both',
          capture_method: 'checkout',
          store: store,
          preferences: {
            client_id: paypal_client_id,
            client_secret: paypal_client_secret,
            webhook_secret: ENV['PAYPAL_WEBHOOK_SECRET'].to_s.strip,
            test_mode: ActiveModel::Type::Boolean.new.cast(ENV.fetch('PAYPAL_TEST_MODE', 'true'))
          }
        )
        paypal.save!(validate: false)
        puts "LABUCO PayPal configured: id=#{paypal.id}"
      end
    end
  end
end
