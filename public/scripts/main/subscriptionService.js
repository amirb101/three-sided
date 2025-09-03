function createSubscriptionService(auth, analytics) {
  const stripe = Stripe("pk_live_51RUt90E3qmOAkttRlUb5xDt0yWaHHCGMf2CUbJtg9itQ5Vc4WMb1Y4qXV02rJDWifGOtfAwCReveumxcIfC2EPxc00Z4YPfEIc");

  async function startSubscription() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to subscribe.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch("https://us-central1-three-sided-flashcard-app.cloudfunctions.net/createCheckoutSession", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });

      const data = await res.json();
      analytics.logEvent('checkout_started', { user_id: user.uid });
      await stripe.redirectToCheckout({ sessionId: data.id });
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Could not start checkout.");
    }
  }

  async function openBillingPortal() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in first.");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch("https://us-central1-three-sided-flashcard-app.cloudfunctions.net/createPortalLink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Request failed: ${res.status} ${errText}`);
      }

      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      console.error("Error opening billing portal:", err);
      alert("Could not open billing portal.");
    }
  }

  return { startSubscription, openBillingPortal };
}
