import { useState } from 'react';

const OnboardingChecklist = () => {
  const [completedSteps, setCompletedSteps] = useState({
    login: false,
    profile: false,
    card: false
  });

  const handleChecklistClick = (step) => {
    if (step === 'login') {
      // Handle login logic
      console.log('Login clicked');
    } else if (step === 'profile') {
      // Handle profile creation
      console.log('Profile clicked');
    } else if (step === 'card') {
      // Handle card creation
      console.log('Card clicked');
    }
  };

  const checklistItems = [
    {
      id: 'login',
      number: 1,
      title: 'Sign in to your account',
      description: 'Log in to start creating and sharing flashcards',
      completed: completedSteps.login
    },
    {
      id: 'profile',
      number: 2,
      title: 'Create your public profile',
      description: 'Set up your profile to share with the community',
      completed: completedSteps.profile
    },
    {
      id: 'card',
      number: 3,
      title: 'Publish your first card',
      description: 'Create and share a flashcard with the community',
      completed: completedSteps.card
    }
  ];

  return (
    <div className="section" id="onboardingSection" style={{marginTop: '2rem'}}>
      <h2 className="section-title" style={{textAlign: 'center'}}>🚀 Get Started with Three-Sided</h2>
      <p style={{textAlign: 'center', fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem'}}>
        Complete these steps to join our community and start sharing flashcards!
      </p>
      
      <div className="onboarding-checklist" style={{maxWidth: '600px', margin: '0 auto'}}>
        {checklistItems.map((item) => (
          <div 
            key={item.id}
            className="checklist-item" 
            id={`checklist-${item.id}`} 
            onClick={() => handleChecklistClick(item.id)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '1rem', 
              marginBottom: '1rem', 
              background: '#fff', 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              opacity: item.completed ? 0.5 : 1
            }}
          >
            <div 
              className="checklist-icon" 
              style={{
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                border: `2px solid ${item.completed ? '#e2e8f0' : '#007bff'}`, 
                marginRight: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px', 
                color: item.completed ? '#e2e8f0' : '#007bff'
              }}
            >
              {item.number}
            </div>
            <div className="checklist-content" style={{flex: 1}}>
              <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem'}}>{item.title}</h3>
              <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>{item.description}</p>
            </div>
            <div className="checklist-arrow" style={{color: '#a0aec0', fontSize: '1.2rem'}}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
