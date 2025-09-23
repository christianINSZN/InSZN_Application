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
  const [plan, setPlan] = useState('price_1SAFtEFQmtxCMsk5yQanLLaY'); // Your Pro Price ID
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !user) {
      setError('Please sign in to subscribe.');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending subscription request for user:', user.id);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscriptions/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan, clerkUserId: user.id }),
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.status === 'incomplete') {
        setError('Subscription created but requires payment confirmation. Please complete the payment.');
        setLoading(false);
        return;
      }

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        alert('Subscription successful! Please refresh the page to access premium content.');
      }
    } catch (err) {
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
          <option value="price_1SAMI6FQmtxCMsk5ZVLVzH1u">Premium ($20/month)</option> // Replace with your Premium Price ID
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