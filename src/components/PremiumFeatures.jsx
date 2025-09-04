import { useState } from 'react'
import StripeService from '../services/stripeService'

const PremiumFeatures = ({ onClose, isVisible = false }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (plan) => {
    try {
      setLoading(true)
      
      // Create checkout session using your Firebase Function
      const sessionId = await StripeService.createCheckoutSession()
      
      // Redirect to Stripe Checkout
      await StripeService.redirectToCheckout(sessionId)
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert('Failed to start subscription process. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setLoading(true)
      
      // Create billing portal link using your Firebase Function
      const portalUrl = await StripeService.createPortalLink()
      
      // Redirect to Stripe Customer Portal
      window.open(portalUrl, '_blank')
    } catch (error) {
      console.error('Error accessing subscription management:', error)
      alert('Failed to access subscription management. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const plans = {
    monthly: {
      price: '£5',
      period: 'month',
      savings: null,
      popular: false
    },
    yearly: {
      price: '£50',
      period: 'year',
      savings: '£10',
      popular: true
    }
  }

  const features = [
    {
      name: 'Spaced Repetition Mode',
      description: 'Advanced algorithm for optimal learning',
      free: '✅',
      premium: '✅',
      icon: '🎯'
    },
    {
      name: 'AI Autofill (Hint, Proof, Tags)',
      description: 'Generate content with AI assistance',
      free: '⚠️ Limited (1/day)',
      premium: '✅ Unlimited',
      icon: '🤖'
    },
    {
      name: 'AI Auto-Tagging',
      description: 'Automatic tag suggestions',
      free: '⚠️ Limited (1/day)',
      premium: '✅ Unlimited',
      icon: '🏷️'
    },
    {
      name: 'AI LaTeX Conversion',
      description: 'Convert text to mathematical notation',
      free: '✅ Unlimited',
      premium: '✅ Unlimited',
      icon: '📐'
    },
    {
      name: 'Public Profile & Sharing',
      description: 'Share your flashcards with the community',
      free: '✅',
      premium: '✅ + Custom Themes',
      icon: '👤'
    },
    {
      name: 'Advanced Analytics',
      description: 'Detailed learning progress tracking',
      free: '❌',
      premium: '✅',
      icon: '📊'
    },
    {
      name: 'Priority Support',
      description: 'Get help when you need it most',
      free: '❌',
      premium: '✅',
      icon: '🎧'
    },
    {
      name: 'Export & Backup',
      description: 'Download your data anytime',
      free: '❌',
      premium: '✅',
      icon: '💾'
    }
  ]


  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-600 via-primary-600 to-secondary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">✨ Premium Features</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 mt-1">Unlock the full potential of Three-Sided</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Plan Selection */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center text-neutral-800 mb-6">Choose Your Plan</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Monthly Plan */}
              <div 
                className={`card p-6 cursor-pointer transition-all duration-200 ${
                  selectedPlan === 'monthly' 
                    ? 'ring-2 ring-primary-500 shadow-glow' 
                    : 'hover:shadow-medium'
                }`}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="text-center">
                  <h4 className="text-xl font-bold text-neutral-800 mb-2">Monthly</h4>
                  <div className="text-3xl font-bold text-primary-600 mb-1">£5</div>
                  <div className="text-neutral-600 mb-4">per month</div>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    selectedPlan === 'monthly' 
                      ? 'bg-primary-500 border-primary-500' 
                      : 'border-neutral-300'
                  }`}></div>
                </div>
              </div>

              {/* Yearly Plan */}
              <div 
                className={`card p-6 cursor-pointer transition-all duration-200 relative ${
                  selectedPlan === 'yearly' 
                    ? 'ring-2 ring-primary-500 shadow-glow' 
                    : 'hover:shadow-medium'
                }`}
                onClick={() => setSelectedPlan('yearly')}
              >
                {plans.yearly.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h4 className="text-xl font-bold text-neutral-800 mb-2">Yearly</h4>
                  <div className="text-3xl font-bold text-primary-600 mb-1">£50</div>
                  <div className="text-neutral-600 mb-2">per year</div>
                  {plans.yearly.savings && (
                    <div className="text-success-600 font-bold mb-4">
                      Save £{plans.yearly.savings}!
                    </div>
                  )}
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    selectedPlan === 'yearly' 
                      ? 'bg-primary-500 border-primary-500' 
                      : 'border-neutral-300'
                  }`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center text-neutral-800 mb-6">Feature Comparison</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-neutral-200">
                    <th className="text-left p-4 font-semibold text-neutral-800">Feature</th>
                    <th className="text-center p-4 font-semibold text-neutral-800">Free</th>
                    <th className="text-center p-4 font-semibold text-neutral-800 bg-gradient-to-r from-primary-50 to-accent-50">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={index} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{feature.icon}</span>
                          <div>
                            <div className="font-medium text-neutral-800">{feature.name}</div>
                            <div className="text-sm text-neutral-600">{feature.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          feature.free === '✅' 
                            ? 'bg-success-100 text-success-800'
                            : feature.free === '⚠️ Limited (1/day)'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {feature.free}
                        </span>
                      </td>
                      <td className="p-4 text-center bg-gradient-to-r from-primary-50 to-accent-50">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
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
            <h3 className="text-2xl font-bold text-center text-neutral-800 mb-6">Why Go Premium?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h4 className="text-lg font-bold text-neutral-800 mb-2">Accelerate Learning</h4>
                <p className="text-neutral-600">
                  Unlimited AI assistance helps you create better flashcards faster
                </p>
              </div>
              
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">📈</div>
                <h4 className="text-lg font-bold text-neutral-800 mb-2">Track Progress</h4>
                <p className="text-neutral-600">
                  Advanced analytics show your learning journey and improvement
                </p>
              </div>
              
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h4 className="text-lg font-bold text-neutral-800 mb-2">Study Smarter</h4>
                <p className="text-neutral-600">
                  Spaced repetition algorithm optimizes your study schedule
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={loading}
              className="btn btn-primary text-lg px-12 py-4 shadow-glow hover:shadow-glow/80"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                `Go Premium - ${plans[selectedPlan].price}/${plans[selectedPlan].period}`
              )}
            </button>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={handleManageSubscription}
                className="btn btn-secondary"
              >
                Manage Subscription
              </button>
              
              <button
                onClick={onClose}
                className="btn btn-secondary"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 p-4 bg-neutral-50 rounded-xl text-center">
            <p className="text-sm text-neutral-600">
              💳 Secure payment powered by Stripe • Cancel anytime • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumFeatures
