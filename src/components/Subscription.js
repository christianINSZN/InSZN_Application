import React, { useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const SubscriptionForm = () => {
  const { user } = useClerk();
  const stripe = useStripe();
  const elements = useElements();
  const [plan, setPlan] = useState('price_1SAFtEFQmtxCMsk5yQanLLaY'); // Pro Price ID
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !user) {
      setError('Please sign in to subscribe.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create payment method
      const { paymentMethod, error: paymentMethodError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          email: user.primaryEmailAddress?.emailAddress || 'unknown',
        },
      });

      if (paymentMethodError) {
        console.error('Payment method error:', paymentMethodError);
        setError(paymentMethodError.message);
        setLoading(false);
        return;
      }

      console.log('Created payment method:', paymentMethod.id);

      // Create subscription
      console.log('Sending subscription request for user:', user.id, 'with priceId:', plan, 'paymentMethodId:', paymentMethod.id);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscriptions/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan, clerkUserId: user.id, paymentMethodId: paymentMethod.id, email: user.primaryEmailAddress?.emailAddress }),
      });
      const data = await response.json();

      if (data.error) {
        console.error('Subscription error:', data.error);
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.clientSecret) {
        const result = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: paymentMethod.id,
        });

        if (result.error) {
          console.error('Payment confirmation error:', result.error);
          setError(result.error.message);
        } else if (result.paymentIntent.status === 'succeeded') {
          console.log('Payment succeeded:', result.paymentIntent);
          alert('Subscription successful! Please refresh the page to access premium content.');
        } else {
          console.warn('Unexpected payment intent status:', result.paymentIntent.status);
          setError('Payment processing incomplete. Please try again.');
        }
      } else if (data.status === 'active') {
        console.log('Subscription active:', data.subscriptionId);
        alert('Subscription successful! Please refresh the page to access premium content.');
      } else {
        console.warn('No clientSecret received:', data);
        setError(data.message || 'Subscription created but requires payment confirmation. Please try again.');
      }
    } catch (err) {
      console.error('Frontend error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-[#235347]">Choose Your Plan</h2>
        {!user && (
          <p className="text-gray-500 mb-4">
            Please <Link to="/sign-in" className="text-[#235347] underline">sign in</Link> to subscribe.
          </p>
        )}
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="mb-4 p-2 border rounded w-full"
          disabled={!user}
        >
          <option value="price_1SAFtEFQmtxCMsk5yQanLLaY">Pro ($5/month)</option>
        </select>
        <CardElement className="p-2 border rounded mb-4" />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          type="submit"
          disabled={!stripe || !user || loading}
          className="px-4 py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32] disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Subscribe'}
        </button>
      </form>
    </div>
  );
};

const Subscription = () => (
  <Elements stripe={stripePromise}>
    <SubscriptionForm />
  </Elements>
);

export default Subscription;