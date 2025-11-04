import React, { useState, useRef } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const SubscriptionForm = () => {
  const { user } = useClerk();
  const stripe = useStripe();
  const elements = useElements();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step, setStep] = useState('plans'); // 'plans', 'payment'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const paymentRef = useRef(null);
  const isMobile = window.innerWidth < 640;

  const currentPlan = user?.publicMetadata?.subscriptionPlan || null;
  const planIdToKey = {
    'price_1SIGOHF6OYpAGuKxF2bIISDL': 'pro',
    'price_pro': 'premium',
    'price_elite': 'elite',
  };

  const plans = [
    {
      id: 'price_1SIGOHF6OYpAGuKxF2bIISDL',
      name: 'Insider',
      price: '$10/month',
      features: [
        'Full platform access',
        'Access to the private INSZN Insider forums and discussion groups',
        'Early access to beta features (Scouting Reports, Game Recaps, Weekly Reports)',
      ],
      bannerImage: '/INSZN_Insider_BETA.png',
      bannerWidthPercent: 60,
    },
    {
      id: 'price_pro',
      name: 'Pro',
      price: 'Contact for Pricing',
      features: [
        'For media organizations, content creators, and producers',
        'Access to specific player-level and positional weekly scouting reports and recaps',
        'Bespoke and fully customizable analytic interfaces',
        'Inquire for additional details',

      ],
      bannerImage: '/INSZN_Pro.png',
      bannerWidthPercent: 48,
    },
    {
      id: 'price_elite',
      name: 'Elite',
      price: 'Contact for Pricing',
      features: [
        'For teams, coaches, and athletic departments',
        'Full access to internal data-modeling tools and datasets',
        'Fully customizable data solutions tailored to your programs needs',
        'Inquire for additional details',
      ],
      bannerImage: '/INSZN_Elite.png',
      bannerWidthPercent: 52,
    },
  ];

  const handlePlanSelect = (planId) => {
    const planKey = planIdToKey[planId];
    const isSamePlan = currentPlan && planKey === currentPlan;
    if (planId === 'price_pro' || planId === 'price_elite' || isSamePlan) return;
    setSelectedPlan(planId);
    setTimeout(() => {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth' });
      setStep('payment');
    }, 200);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !user || !selectedPlan) {
      setError('Please sign in and select a plan to subscribe.');
      return;
    }
    const selectedPlanKey = planIdToKey[selectedPlan];
    if (currentPlan && selectedPlanKey === currentPlan) {
      setError('You are already subscribed to this plan.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { paymentMethod, error: paymentMethodError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: { email: user.primaryEmailAddress?.emailAddress || 'unknown' },
      });
      if (paymentMethodError) {
        console.error('Payment method error:', paymentMethodError);
        setError(paymentMethodError.message);
        setLoading(false);
        return;
      }
      console.log('Created payment method:', paymentMethod.id);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscriptions/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedPlan,
          clerkUserId: user.id,
          paymentMethodId: paymentMethod.id,
          email: user.primaryEmailAddress?.emailAddress,
        }),
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
    <div className="w-full min-h-screen bg-gray-50 py-6 px-4 sm:px-6 mt-0 sm:mt-12">
      {!user && (
        <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
          Please <Link to="/sign-in" className="text-[#235347] underline">sign in</Link> to subscribe.
        </p>
      )}
      {step === 'plans' ? (
        <>
          <h2 className="text-xl sm:text-2xl font-bold text-[#235347] text-center mb-6">Subscription Packages</h2>
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-12'} justify-center mb-12`}>
            {plans.map((plan) => {
              const planKey = planIdToKey[plan.id];
              const isUserSubscribedToThisPlan = currentPlan && planKey === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative border-2 ${
                    selectedPlan === plan.id ? 'border-[#235347] bg-[#235347]/10' : 'border-gray-300'
                  } rounded-lg shadow-lg ${
                    plan.id === 'price_pro' || plan.id === 'price_elite'
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer hover:border-[#235347] hover:bg-[#235347]/10'
                  } transition-colors ${isMobile ? 'w-full' : 'w-1/3'}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <img
                    src={plan.bannerImage}
                    alt={`${plan.name} Plan Banner`}
                    className="h-auto mx-auto rounded-t-lg object-contain min-w-0 mt-5"
                    style={{ width: `${plan.bannerWidthPercent}%` }}
                  />
                  <div className="p-4">
                    <p className="text-center font-medium text-[#235347] mb-2 text-sm sm:text-base mb-10">{plan.price}</p>
                    <ul className="list-disc list-outside pl-4 space-y-2 text-[12px] sm:text-sm text-gray-700 ml-2">
                      {plan.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                    {(plan.id === 'price_pro' || plan.id === 'price_elite') && (
                      <p className="text-center font-bold text-[12px] sm:text-sm text-gray-700 mt-4">
                        <a href="mailto:data@inszn.co" className="text-[#235347] underline">Contact Us</a>
                      </p>
                    )}
                  </div>
                  {isUserSubscribedToThisPlan && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 border-2 border-[#235347] rounded-lg">
                      <p className="text-[#235347] font-semibold text-[18px] sm:text-sm">Current Subscription</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div ref={paymentRef} className="flex items-center justify-center">
          <form onSubmit={handleSubmit} className={`p-6 w-full sm:w-1/2 bg-white rounded-lg shadow-lg border-2 border-[#235347]`}>
            <h2 className="text-xl sm:text-2xl font-bold text-[#235347] mb-6">Enter Payment Details</h2>
            <p className="text-gray-700 mb-6 text-sm sm:text-base">
              Selected Plan: {plans.find((p) => p.id === selectedPlan)?.name || 'None'}
            </p>
            <div className="p-3 border border-gray-300 rounded mb-6">
              <CardElement className="text-sm sm:text-base" />
            </div>
            {error && <p className="text-red-500 mb-6 text-sm sm:text-base">{error}</p>}
            <button
              type="submit"
              disabled={!stripe || !user || loading || (selectedPlan && planIdToKey[selectedPlan] === currentPlan)}
              className="px-6 py-3 bg-[#235347] text-white rounded hover:bg-[#1b3e32] disabled:bg-gray-400 text-sm sm:text-base w-full"
            >
              {loading ? 'Processing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const Subscription = () => (
  <Elements stripe={stripePromise}>
    <SubscriptionForm />
  </Elements>
);

export default Subscription;