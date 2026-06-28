export {};

declare global {
  const __APP_VERSION__: string;
  const __STRIPE_PUBLISHABLE_KEY__: string;
  const __STRIPE_BUY_BUTTON_ID__: string;
}

// Register the Stripe Buy Button web component as a known intrinsic element.
// React 19 keeps the JSX namespace under the 'react' module, so augment that
// (a global `namespace JSX` would shadow all built-in elements like div/span).
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': import('react').DetailedHTMLProps<
        import('react').HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        'buy-button-id'?: string;
        'publishable-key'?: string;
      };
    }
  }
}
