import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'shop',
    loadChildren: () =>
      import('./features/shop/shop.module').then((m) => m.ShopModule),
  },
  {
    path: 'quiz',
    loadChildren: () =>
      import('./features/quiz/quiz.module').then((m) => m.QuizModule),
  },
  {
    path: 'checkout',
    loadChildren: () =>
      import('./features/checkout/checkout.module').then(
        (m) => m.CheckoutModule
      ),
  },
  {
    path: 'payment',
    loadChildren: () =>
      import('./features/payment-result/payment-result.module').then(
        (m) => m.PaymentResultModule
      ),
  },
  {
    path: 'order-success',
    loadChildren: () =>
      import('./features/order-success/order-success.module').then(
        (m) => m.OrderSuccessModule
      ),
  },
  {
    path: 'track',
    loadChildren: () =>
      import('./features/track-order/track-order.module').then(
        (m) => m.TrackOrderModule
      ),
  },
  {
    path: 'track-order',
    loadChildren: () =>
      import('./features/track-order/track-order.module').then(
        (m) => m.TrackOrderModule
      ),
  },
  {
    path: 'shipping-policy',
    loadChildren: () =>
      import('./features/shipping-policy/shipping-policy.module').then(
        (m) => m.ShippingPolicyModule
      ),
  },
  {
    path: 'return-policy',
    loadChildren: () =>
      import('./features/return-policy/return-policy.module').then(
        (m) => m.ReturnPolicyModule
      ),
  },
  {
    path: 'shipping',
    redirectTo: 'shipping-policy',
    pathMatch: 'full',
  },
  {
    path: '404',
    loadChildren: () =>
      import('./features/not-found/not-found.module').then(
        (m) => m.NotFoundModule
      ),
  },
  // Catch-all: render 404 Not Found page for unknown routes
  {
    path: '**',
    loadChildren: () =>
      import('./features/not-found/not-found.module').then(
        (m) => m.NotFoundModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      useHash: false,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
