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
  const [promoCode, setPromoCode] = useState('');
  const [isValidPromo, setIsValidPromo] = useState(false);
  const [promoError, setPromoError] = useState(null);
  const [step, setStep] = useState('plans');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const paymentRef = useRef(null);
  const isMobile = window.innerWidth < 640;

  const currentPlan = user?.publicMetadata?.subscriptionPlan || null;

  const planIdToKey = {
    'price_1SVdVlF6OYpAGuKxD9OKJYzD': 'pro',
    'price_pro': 'premium',
    'price_elite': 'elite',
  };

  const validPromoCodes = ['JAKE2025', 'MIAINSZN', 'TYLER100', 'SARAHPRO', 'FOUNDERS', 'BETA15', 'INSIDER15'];

  const plans = [
    {
      id: 'price_1SVdVlF6OYpAGuKxD9OKJYzD',
      name: 'Insider',
      price: '$20/month',
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

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      setIsValidPromo(false);
      return;
    }

    if (validPromoCodes.includes(promoCode)) {
      setIsValidPromo(true);
      setPromoError(null);
    } else {
      setIsValidPromo(false);
      setPromoError('Invalid or expired promo code');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !user || !selectedPlan) {
      setError('Please sign in and select a plan.');
      return;
    }

    if (currentPlan && planIdToKey[selectedPlan] === currentPlan) {
      setError('You are already subscribed to this plan.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          email: user.primaryEmailAddress?.emailAddress || 'unknown',
        },
      });

      if (pmError) {
        setError(pmError.message);
        setLoading(false);
        return;
      }

      const finalPriceId = isValidPromo
        ? 'price_1SVcw8F6OYpAGuKxhZ0y3jrK'  // $15 with promo
        : selectedPlan;                        // $20 normal

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscriptions/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: finalPriceId,
          clerkUserId: user.id,
          paymentMethodId: paymentMethod.id,
          email: user.primaryEmailAddress?.emailAddress,
          promoCode: promoCode || null,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: paymentMethod.id,
        });

        if (confirmError) {
          setError(confirmError.message);
        } else {
          alert('Subscription successful! Please refresh the page.');
        }
      } else if (data.status === 'active') {
        alert('Subscription successful! Please refresh the page.');
      } else {
        setError('Something went wrong.');
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-6 px-4 sm:px-6 mt-0 sm:mt-12">
      {!user && (
        <p className="text-center text-gray-500 mb-6">
          Please <Link to="/sign-in" className="text-[#235347] underline">sign in</Link> to subscribe.
        </p>
      )}

      {step === 'plans' ? (
        <>
          <h2 className="text-xl sm:text-2xl font-bold text-[#235347] text-center mb-6">Subscription Packages</h2>
          <div className={`flex ${isMobile ? 'flex-col gap-8' : 'flex-row gap-12'} justify-center`}>
            {plans.map((plan) => {
              const isSubscribed = currentPlan && planIdToKey[plan.id] === currentPlan;

              return (
                <div
                  key={plan.id}
                  className={`relative border-2 rounded-lg shadow-lg p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-[#235347] bg-[#235347]/5'
                      : 'border-gray-300 hover:border-[#235347]'
                  } ${plan.id !== 'price_1SVdVlF6OYpAGuKxD9OKJYzD' ? 'opacity-60' : ''}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <img
                    src={plan.bannerImage}
                    alt={plan.name}
                    className="mx-auto mb-4"
                    style={{ width: `${plan.bannerWidthPercent}%` }}
                  />
                  <p className="text-2xl font-bold text-[#235347] text-center mb-8">{plan.price}</p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {plan.features.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                  {isSubscribed && (
                    <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
                      <p className="text-[#235347] font-bold text-lg">Current Plan</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div ref={paymentRef} className="max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-8 border-2 border-[#235347]">
            <h2 className="text-2xl font-bold text-[#235347] mb-6">Complete Your Subscription</h2>

            <p className="text-lg mb-6">
              Plan: <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>
              {' '}—{' '}
              <strong>{isValidPromo ? '$15' : '$20'}/month</strong>
            </p>

            {/* Promo Code Input + Button */}
            <div className="mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Promo code (optional)"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.trim().toUpperCase());
                    setPromoError(null);
                    setIsValidPromo(false);
                  }}
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:border-[#235347]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-6 py- py-3 bg-[#235347] text-white rounded-lg hover:bg-[#1b3e32] font-medium"
                >
                  Apply Code
                </button>
              </div>

              {isValidPromo && (
                <p className="text-green-600 font-bold mt-3">
                  Promo applied! $15/month confirmed
                </p>
              )}
              {promoError && (
                <p className="text-red-500 mt-3">{promoError}</p>
              )}
            </div>

            <div className="p-4 border rounded-lg mb-6 bg-gray-50">
              <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading || !stripe}
              className="w-full py-4 bg-[#235347] text-white text-lg font-semibold rounded-lg hover:bg-[#1b3e32] disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Complete Purchase'}
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