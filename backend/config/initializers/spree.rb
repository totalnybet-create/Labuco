# frozen_string_literal: true

Spree.config do |config|
  # Application-wide Spree preferences are intentionally left at defaults.
end

Spree.dependencies do |_dependencies|
  # Dependency overrides belong here when LABUCO needs them.
end

Rails.application.config.after_initialize do
  # Register the LABUCO HotPay payment method with Spree's provider registry.
  unless Spree.payment_methods.include?(Spree::PaymentMethod::Hotpay)
    Spree.payment_methods << Spree::PaymentMethod::Hotpay
  end

  # Role-based permissions
  Spree.permissions.assign(:default, [Spree::PermissionSets::DefaultCustomer])
  Spree.permissions.assign(:admin, [Spree::PermissionSets::SuperUser])
end

Spree.user_class = 'Spree::User'
Spree.admin_user_class = 'Spree::AdminUser'

Spree.cdn_host = ENV['CDN_HOST'] if ENV['CDN_HOST'].present?

# Background job queue configuration
Spree.queues.default = :default
Spree.queues.events = :spree_events
Spree.queues.exports = :spree_exports
Spree.queues.images = :spree_images
Spree.queues.imports = :spree_imports
Spree.queues.products = :spree_products
Spree.queues.reports = :spree_reports
Spree.queues.variants = :spree_variants
Spree.queues.taxons = :spree_taxons
Spree.queues.stock_location_stock_items = :spree_stock_location_stock_items
Spree.queues.coupon_codes = :spree_coupon_codes
Spree.queues.addresses = :spree_addresses
Spree.queues.gift_cards = :spree_gift_cards
Spree.queues.webhooks = :spree_webhooks
Spree.queues.payment_webhooks = :spree_payment_webhooks
Spree.queues.api_keys = :spree_api_keys
Spree.queues.search = :spree_search

if ENV['MEILISEARCH_URL'].present?
  Spree.search_provider = 'Spree::SearchProvider::Meilisearch'
end

Rails.application.config.to_prepare do
  require_dependency 'spree/authentication_helpers'
end

Devise.parent_controller = 'Spree::BaseController' if defined?(Devise) && Devise.respond_to?(:parent_controller)
