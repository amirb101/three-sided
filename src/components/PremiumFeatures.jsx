import { useEffect, useRef, useState, useCallback } from 'react';
import StripeService from '../services/stripeService';

const plans = {
  monthly: {
    label: 'Monthly',
    displayPrice: '£5',
    period: 'month',
    savings: null,
    popular: false,
    // TODO: replace with your real monthly price ID when you want to send it to backend
    priceId: 'price_1RUvcJE3qmOAkttR2Rh4YzOY',
    interval: 'month',
  },
  yearly: {
    label: 'Yearly', 
    displayPrice: '£50',
    period: 'year',
    savings: '£10',
    popular: true,
    // TODO: replace with your real yearly price ID when you want to send it to backend
    priceId: 'price_YEARLY_REPLACE_ME',
    interval: 'year',
  },
};

const features = [
  { name: 'Spaced Repetition Mode', description: 'Advanced algorithm for optimal learning', free: '✅', premium: '✅', icon: '🎯' },
  { name: 'AI Autofill (Hint, Proof, Tags)', description: 'Generate content with AI assistance', free: '⚠️ Limited (1/day)', premium: '✅ Unlimited', icon: '🤖' },
  { name: 'AI Auto-Tagging', description: 'Automatic tag suggestions', free: '⚠️ Limited (1/day)', premium: '✅ Unlimited', icon: '🏷️' },
  { name: 'AI LaTeX Conversion', description: 'Convert text to mathematical notation', free: '✅ Unlimited', premium: '✅ Unlimited', icon: '📐' },
  { name: 'Public Profile & Sharing', description: 'Share your flashcards with the community', free: '✅', premium: '✅ + Custom Themes', icon: '👤' },
  { name: 'Advanced Analytics', description: 'Detailed learning progress tracking', free: '❌', premium: '✅', icon: '📊' },
  { name: 'Priority Support', description: 'Get help when you need it most', free: '❌', premium: '✅', icon: '🎧' },
  { name: 'Export & Backup', description: 'Download your data anytime', free: '❌', premium: '✅', icon: '💾' },
];

const PremiumFeatures = ({ onClose, isVisible = false }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);

  // Body scroll lock
  useEffect(() => {
    if (isVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isVisible]);

  // Focus dialog + ESC to close
  useEffect(() => {
    if (!isVisible) return;
    setTimeout(() => dialogRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible, onClose]);

  const handleSubscribe = useCallback(async () => {
    setError('');
    const plan = plans[selectedPlan];
    
    try {
      setCreatingCheckout(true);
      
      // Use your existing backend function (keeping it unchanged)
      // Later you can modify your backend to accept the selected plan details
      const sessionId = await StripeService.createCheckoutSession();
      
      // Redirect to Stripe Checkout using your existing function
      await StripeService.redirectToCheckout(sessionId);
      
    } catch (e) {
      console.error('Error creating subscription:', e);
      setError('Failed to start subscription. Please check your connection and try again.');
    } finally {
      setCreatingCheckout(false);
    }
  }, [selectedPlan]);

  const handleManageSubscription = useCallback(async () => {
    setError('');
    try {
      setOpeningPortal(true);
      
      // Use your existing backend function (keeping it unchanged)
      const portalUrl = await StripeService.createPortalLink();
      
      // Use same-tab navigation as your existing code
      window.location.href = portalUrl;
      
    } catch (e) {
      console.error('Error accessing subscription management:', e);
      setError('Failed to open the billing portal. Please try again.');
    } finally {
      setOpeningPortal(false);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-title"
        className="claude-card rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="px-6 py-4 text-white claude-gradient">
          <div className="flex items-center justify-between">
            <h2 id="premium-title" className="text-2xl font-bold">✨ Premium Features</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 mt-1">Unlock the full potential of Three-Sided</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Error banner */}
          {error && (
            <div className="claude-alert claude-alert-error mb-4">
              {error}
            </div>
          )}

          {/* Plan Selection */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center mb-6" style={{color: 'var(--heading)'}}>Choose Your Plan</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto" role="radiogroup" aria-label="Billing plan">
              {/* Monthly */}
              <label
                className={`claude-card p-6 cursor-pointer transition-all duration-200 ${
                  selectedPlan === 'monthly' ? 'claude-card-elevated' : ''
                }`}
                style={{
                  border: selectedPlan === 'monthly' ? '2px solid var(--accent-primary)' : undefined,
                  boxShadow: selectedPlan === 'monthly' ? '0 0 20px rgba(99, 91, 255, 0.2)' : undefined
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  className="sr-only"
                  checked={selectedPlan === 'monthly'}
                  onChange={() => setSelectedPlan('monthly')}
                  aria-label="Monthly plan"
                />
                <div className="text-center">
                  <h4 className="text-xl font-bold mb-2" style={{color: 'var(--heading)'}}>{plans.monthly.label}</h4>
                  <div className="text-3xl font-bold mb-1" style={{color: 'var(--accent-primary)'}}>{plans.monthly.displayPrice}</div>
                  <div className="claude-text-secondary mb-4">per {plans.monthly.period}</div>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    selectedPlan === 'monthly' 
                      ? 'border-2' 
                      : 'border-2'
                  }`} style={{
                    backgroundColor: selectedPlan === 'monthly' ? 'var(--accent-primary)' : 'transparent',
                    borderColor: selectedPlan === 'monthly' ? 'var(--accent-primary)' : 'var(--border-light)'
                  }} />
                </div>
              </label>

              {/* Yearly */}
              <label
                className={`claude-card p-6 cursor-pointer transition-all duration-200 relative ${
                  selectedPlan === 'yearly' ? 'claude-card-elevated' : ''
                }`}
                style={{
                  border: selectedPlan === 'yearly' ? '2px solid var(--accent-primary)' : undefined,
                  boxShadow: selectedPlan === 'yearly' ? '0 0 20px rgba(99, 91, 255, 0.2)' : undefined
                }}
              >
                {plans.yearly.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-white px-3 py-1 rounded-full text-xs font-bold" style={{backgroundColor: 'var(--accent-secondary)'}}>
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <input
                  type="radio"
                  name="plan"
                  value="yearly"
                  className="sr-only"
                  checked={selectedPlan === 'yearly'}
                  onChange={() => setSelectedPlan('yearly')}
                  aria-label="Yearly plan"
                />
                <div className="text-center">
                  <h4 className="text-xl font-bold mb-2" style={{color: 'var(--heading)'}}>{plans.yearly.label}</h4>
                  <div className="text-3xl font-bold mb-1" style={{color: 'var(--accent-primary)'}}>{plans.yearly.displayPrice}</div>
                  <div className="claude-text-secondary mb-2">per {plans.yearly.period}</div>
                  {plans.yearly.savings && (
                    <div className="font-bold mb-4" style={{color: 'var(--success)'}}>Save {plans.yearly.savings}!</div>
                  )}
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto`} style={{
                    backgroundColor: selectedPlan === 'yearly' ? 'var(--accent-primary)' : 'transparent',
                    borderColor: selectedPlan === 'yearly' ? 'var(--accent-primary)' : 'var(--border-light)'
                  }} />
                </div>
              </label>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center mb-6" style={{color: 'var(--heading)'}}>Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom: '2px solid var(--border-light)'}}>
                    <th className="text-left p-4 font-semibold" style={{color: 'var(--heading)'}}>Feature</th>
                    <th className="text-center p-4 font-semibold" style={{color: 'var(--heading)'}}>Free</th>
                    <th className="text-center p-4 font-semibold rounded-lg" style={{
                      color: 'var(--heading)',
                      background: 'linear-gradient(to right, rgba(99, 91, 255, 0.1), rgba(68, 90, 255, 0.1))'
                    }}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, i) => (
                    <tr key={i} className="claude-card hover:shadow-sm transition-all" style={{border: 'none', marginBottom: '4px'}}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{feature.icon}</span>
                          <div>
                            <div className="font-medium" style={{color: 'var(--heading)'}}>{feature.name}</div>
                            <div className="text-sm claude-text-secondary">{feature.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium`} style={{
                          backgroundColor: feature.free === '✅' 
                            ? 'rgba(91, 200, 162, 0.1)' 
                            : feature.free.startsWith('⚠️')
                            ? 'rgba(255, 213, 84, 0.1)'
                            : 'var(--background-modal)',
                          color: feature.free === '✅'
                            ? 'var(--success)'
                            : feature.free.startsWith('⚠️')
                            ? 'var(--warning)'
                            : 'var(--text-secondary)'
                        }}>
                          {feature.free}
                        </span>
                      </td>
                      <td className="p-4 text-center" style={{
                        background: 'linear-gradient(to right, rgba(99, 91, 255, 0.05), rgba(68, 90, 255, 0.05))'
                      }}>
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{
                          backgroundColor: 'rgba(91, 200, 162, 0.1)',
                          color: 'var(--success)'
                        }}>
                          {feature.premium}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center mb-6" style={{color: 'var(--heading)'}}>Why Go Premium?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="claude-card p-6 text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h4 className="text-lg font-bold mb-2" style={{color: 'var(--heading)'}}>Accelerate Learning</h4>
                <p className="claude-text-secondary">Unlimited AI assistance helps you create better flashcards faster</p>
              </div>
              <div className="claude-card p-6 text-center">
                <div className="text-4xl mb-4">📈</div>
                <h4 className="text-lg font-bold mb-2" style={{color: 'var(--heading)'}}>Track Progress</h4>
                <p className="claude-text-secondary">Advanced analytics show your learning journey and improvement</p>
              </div>
              <div className="claude-card p-6 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h4 className="text-lg font-bold mb-2" style={{color: 'var(--heading)'}}>Study Smarter</h4>
                <p className="claude-text-secondary">Spaced repetition algorithm optimizes your study schedule</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="text-center space-y-4">
            <button
              onClick={handleSubscribe}
              disabled={creatingCheckout}
              className="claude-button-primary text-lg px-12 py-4 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{boxShadow: '0 0 20px rgba(99, 91, 255, 0.3)'}}
            >
              {creatingCheckout ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Go Premium - ${plans[selectedPlan].displayPrice}/${plans[selectedPlan].period}`
              )}
            </button>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleManageSubscription}
                disabled={openingPortal}
                className="claude-button-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {openingPortal ? 'Opening…' : 'Manage Subscription'}
              </button>

              <button onClick={onClose} className="claude-button-secondary">
                Maybe Later
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 p-4 rounded-xl text-center" style={{backgroundColor: 'var(--background-modal)'}}>
            <p className="text-sm claude-text-secondary">
              💳 Secure payment powered by Stripe • Cancel anytime • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumFeatures;