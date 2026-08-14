
Rails.application.routes.draw do
  # HotPay sends server-to-server form-data notifications. Keep this route
  # outside the Spree engine and before the root mount so it cannot be
  # swallowed by storefront routes.
  post '/payments/hotpay/webhook', to: 'hotpay_webhooks#create'

  Spree::Core::Engine.add_routes do
    # Admin authentication
    devise_for(
      Spree.admin_user_class.model_name.singular_route_key,
      class_name: Spree.admin_user_class.to_s,
      controllers: {
        sessions: 'spree/admin/user_sessions',
        passwords: 'spree/admin/user_passwords'
      },
      skip: :registrations,
      path: :admin_user,
      router_name: :spree
    )
  end

  mount Spree::Core::Engine, at: '/'
  devise_for :admin_users, class_name: "Spree::AdminUser"
  devise_for :users, class_name: "Spree::User"

  mount MissionControl::Jobs::Engine, at: "/jobs"

  get "up" => "rails/health#show", as: :rails_health_check

  root to: redirect('/admin')
end
