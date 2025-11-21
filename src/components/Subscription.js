import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // ← add this if not already there
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
  const navigate = useNavigate();

  const planIdToKey = {
    'price_1SVdVlF6OYpAGuKxD9OKJYzD': 'pro',
    'price_pro': 'premium',
    'price_elite': 'elite',
  };

  const validPromoCodes = ['MILESINSZN', 'MIGUEL25', 'FOUNDERSCLUB', 'BLAZE25', 'TARTER25', 'BRAXTONINSZN'];

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

    if (!user) {
      return; // Do nothing — overlay handles it
    }

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
        setError(paymentMethodError.message);
        setLoading(false);
        return;
      }
      const finalPriceId = isValidPromo
        ? 'price_1SVcw8F6OYpAGuKxhZ0y3jrK' // $15 with promo
        : selectedPlan; // $20 normal
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
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: paymentMethod.id,
        });
        if (confirmError) {
          console.error('Payment confirmation failed:', confirmError);
          setError(confirmError.message || 'Payment failed. Please try again.');
        } else if (paymentIntent?.status === 'succeeded') {
          window.location.href = '/';
          alert('Subscription successful! Welcome to INSZN Insider');
        } else {
          setError('Payment requires additional verification. Please complete the bank popup.');
        }
      } else if (data.status === 'active') {
        window.location.href = '/';
        alert('Subscription successful! Welcome to INSZN Insider');
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-6 px-4 sm:px-6 mt-0 sm:mt-12">
      {!user && (
        <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
        </p>
      )}

      {step === 'plans' ? (
        <>
          <h2 className="text-xl sm:text-2xl font-bold text-[#235347] text-center mb-6">Subscription Packages</h2>
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-12'} justify-center mb-12`}>
            {plans.map((plan) => {
              const planKey = planIdToKey[plan.id];
              const isUserSubscribedToThisPlan = currentPlan && planKey === currentPlan;

              const isClickable = plan.id === 'price_1SVdVlF6OYpAGuKxD9OKJYzD' && !!user;

              return (
                <div
                  key={plan.id}
                  className={`relative border-2 ${
                    selectedPlan === plan.id ? 'border-[#235347] bg-[#235347]/10' : 'border-gray-300'
                  } rounded-lg shadow-lg ${
                    plan.id === 'price_pro' || plan.id === 'price_elite'
                      ? 'cursor-not-allowed'
                      : isClickable
                      ? 'cursor-pointer hover:border-[#235347] hover:bg-[#235347]/10'
                      : 'cursor-default'
                  } transition-colors ${isMobile ? 'w-full' : 'w-1/3'}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {/* Clean, subtle overlay for non-logged-in users */}
                  {!user && plan.id === 'price_1SVdVlF6OYpAGuKxD9OKJYzD' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-10 text-white text-center p-6">
                      <div>
                        <p className="font-medium text-lg mb-4">Please Sign Up or Sign In to Subscribe</p>
                        <div className="flex flex-col gap-3">
                          <Link
                            to="/sign-up"
                            className="block px-6 py-3 bg-white text-[#235347] font-semibold rounded-lg hover:bg-gray-100 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Sign Up
                          </Link>
                          <Link
                            to="/sign-in"
                            className="block px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white hover:text-[#235347] transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Sign In
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

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
          <form onSubmit={handleSubmit} className="p-6 w-full sm:w-1/2 bg-white rounded-lg shadow-lg border-2 border-[#235347]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#235347] mb-6">Enter Payment Details</h2>
            <p className="text-gray-700 mb-4">
              Selected Plan: {plans.find((p) => p.id === selectedPlan)?.name || 'None'}
            </p>
            {/* Promo Code Field + Apply Button */}
            <div className="mb-6">
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
                  className="flex-1 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#235347]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-6 py-3 bg-[#235347] text-white rounded-lg hover:bg-[#1b3e32] text-sm font-medium"
                >
                  Apply Code
                </button>
              </div>
              {isValidPromo && (
                <p className="text-green-600 font-semibold mt-3">
                  Promo applied! You’re getting Insider for <strong>$15/month</strong>
                </p>
              )}
              {promoError && (
                <p className="text-red-500 mt-3 text-sm">{promoError}</p>
              )}
            </div>
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