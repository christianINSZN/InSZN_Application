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
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [step, setStep] = useState('plans'); // 'plans', 'add-ons', 'payment'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const addOnsRef = useRef(null);
  const paymentRef = useRef(null);
  const isMobile = window.innerWidth < 640;

  const plans = [
    { id: 'price_1SC4GLFQmtxCMsk5Zc2xYijK', name: 'Insider', price: '$10/month', features: ['Full platform access', 'FieldView and Head-to-Head (with LineView and CoverageView upon release)', 'Early access to beta features (Scouting Reports, Game Recaps, Weekly Reports)'] },
    { id: 'price_pro', name: 'Pro', price: '$25/month', features: ['Everything included in INSZN Insider', 'Access to specific player-level and positional weekly scouting reports and recaps', 'Bespoke and fully customizable weekly reports sent directly to your inbox (at the national, conference, team, or player-level)', 'Request new platform features'] },
    { id: 'price_elite', name: 'Elite', price: 'Contact for Pricing', features: ['Everything included in INSZN Pro', 'Full white label solutions for your media, product, or analytical needs', 'End-to-end support for hosting your own subscription plans or platform add-ons', 'Inquire for additional details'] },
  ];

  const addOns = [
    { id: 'addon_stats', name: 'Stats Plus', description: 'In-depth analytics and trends' },
    { id: 'addon_recaps', name: 'Game Recaps', description: 'Detailed game summaries' },
    { id: 'addon_support', name: 'Premium Support', description: '24/7 priority customer support' },
  ];

  const handlePlanSelect = (planId) => {
    if (planId !== 'price_pro' && planId !== 'price_elite') {
      setSelectedPlan(planId);
      setTimeout(() => {
        addOnsRef.current?.scrollIntoView({ behavior: 'smooth' });
        setStep('add-ons');
      }, 200);
    }
  };

  const handleAddOnToggle = (addOnId) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId) ? prev.filter(id => id !== addOnId) : [...prev, addOnId]
    );
  };

  const handleNext = () => {
    if (step === 'add-ons') {
      setStep('payment');
      setTimeout(() => {
        paymentRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !user || !selectedPlan) {
      setError('Please sign in and select a plan to subscribe.');
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
          addOns: selectedAddOns,
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
      {step === 'plans' || step === 'add-ons' ? (
        <>
          <h2 className="text-xl sm:text-2xl font-bold text-[#235347] text-center mb-6">Subscription Packages</h2>
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-4'} justify-center mb-12`}>
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative border-2 ${selectedPlan === plan.id ? 'border-[#235347] bg-[#235347]/10' : 'border-gray-300'} rounded-lg shadow-lg ${plan.id === 'price_insider' ? 'cursor-pointer hover:border-[#235347] hover:bg-[#235347]/10' : 'cursor-not-allowed'} transition-colors ${isMobile ? 'w-full' : 'w-1/3'}`}
                onClick={() => handlePlanSelect(plan.id)}
                onMouseEnter={() => plan.id === 'price_pro' && setHoveredPlan(plan.id)}
                onMouseLeave={() => plan.id === 'price_pro' && setHoveredPlan(null)}
              >
                <div className="bg-[#235347] text-white text-center font-semibold p-3 rounded-t-lg text-sm sm:text-base">
                  {plan.name} Plan
                </div>
                <div className="p-4">
                  <p className="text-center font-medium text-[#235347] mb-2 text-sm sm:text-base">{plan.price}</p>
                  <ul className="list-disc list-inside space-y-2 text-[12px] sm:text-sm text-gray-700">
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                  {plan.id === 'price_insider' && (
                    <p className="text-center font-bold italic text-[12px] sm:text-sm text-gray-700 mt-4">
                      Automatic upgrade to INSZN PRO
                    </p>
                  )}
                  {plan.id === 'price_elite' && (
                    <p className="text-center font-bold text-[12px] sm:text-sm text-gray-700 mt-4">
                      Contact: <a href="mailto:christian@perennialsportsgroup.com" className="text-[#235347] underline">christian@perennialsportsgroup.com</a>
                    </p>
                  )}
                </div>
                {plan.id === 'price_pro' && hoveredPlan === plan.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 border-2 border-[#235347] rounded-lg">
                    <p className="text-[#235347] font-semibold text-[12px] sm:text-sm">Coming Soon</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div ref={addOnsRef}>
            <h2 className="text-xl sm:text-2xl font-bold text-[#235347] text-center mb-6">Select Add-ons</h2>
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-4'} justify-center mb-12`}>
              {addOns.map(addOn => (
                <div
                  key={addOn.id}
                  className={`border-2 ${selectedAddOns.includes(addOn.id) ? 'border-[#235347] bg-[#235347]/10' : 'border-gray-300'} rounded-lg shadow-lg cursor-pointer hover:border-[#235347] transition-colors ${isMobile ? 'w-full' : 'w-1/3'}`}
                  onClick={() => handleAddOnToggle(addOn.id)}
                >
                  <div className="bg-[#235347] text-white text-center font-semibold p-3 rounded-t-lg text-sm sm:text-base">
                    {addOn.name}
                  </div>
                  <div className="p-4">
                    <p className="text-center text-[12px] sm:text-sm text-gray-700">{addOn.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={handleNext}
                disabled={!selectedPlan}
                className="px-4 py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32] disabled:bg-gray-400 text-sm sm:text-base"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div ref={paymentRef} className="flex items-center justify-center">
          <form onSubmit={handleSubmit} className={`p-4 ${isMobile ? 'w-full' : 'max-w-md'} bg-white rounded-lg shadow-lg`}>
            <h2 className="text-xl sm:text-2xl font-bold text-[#235347] mb-4">Enter Payment Details</h2>
            <p className="text-gray-700 mb-4 text-sm sm:text-base">
              Selected Plan: {plans.find(p => p.id === selectedPlan)?.name || 'None'}
              {selectedAddOns.length > 0 && (
                <span> with {selectedAddOns.map(id => addOns.find(a => a.id === id)?.name).join(', ')}</span>
              )}
            </p>
            <CardElement className="p-2 border rounded mb-4 text-sm sm:text-base" />
            {error && <p className="text-red-500 mb-4 text-sm sm:text-base">{error}</p>}
            <button
              type="submit"
              disabled={!stripe || !user || loading}
              className="px-4 py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32] disabled:bg-gray-400 text-sm sm:text-base"
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