# frozen_string_literal: true

namespace :labuco do
  namespace :stripe do
    desc 'Idempotently configure the LABUCO Stripe gateway from environment variables'
    task configure: :environment do
      publishable_key = ENV['STRIPE_PUBLISHABLE_KEY'].to_s.strip
      secret_key = ENV['STRIPE_SECRET_KEY'].to_s.strip

      if publishable_key.empty? && secret_key.empty?
        puts 'LABUCO Stripe gateway bootstrap skipped (Stripe credentials are not configured)'
        next
      end

      if publishable_key.empty? || secret_key.empty?
        raise 'Both STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must be configured together'
      end

      publishable_mode =
        if publishable_key.start_with?('pk_live_')
          :live
        elsif publishable_key.start_with?('pk_test_')
          :test
        end

      secret_mode =
        if secret_key.start_with?('sk_live_')
          :live
        elsif secret_key.start_with?('sk_test_')
          :test
        end

      unless publishable_mode && secret_mode && publishable_mode == secret_mode
        raise 'Stripe keys must be a matching pk_/sk_ pair from the same mode (test or live)'
      end

      store = Spree::Store.default
      raise 'Default Spree store is missing' unless store

      gateway = Spree::PaymentMethod
        .where(type: 'SpreeStripe::Gateway', name: 'LABUCO Stripe')
        .first_or_initialize

      gateway.assign_attributes(
        active: true,
        display_on: 'both',
        auto_capture: true,
        stores: [store],
        preferences: {
          publishable_key: publishable_key,
          secret_key: secret_key
        }
      )

      # The credentials are exercised when Stripe creates a PaymentIntent.
      # Skipping the save-time network validation makes deploys deterministic
      # and avoids storing any key outside Spree's encrypted preferences.
      gateway.save!(validate: false)

      puts "LABUCO Stripe gateway configured: id=#{gateway.id}, mode=#{publishable_mode}"
    end
  end
end
