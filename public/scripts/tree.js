class KnowledgeTreeGenerator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.loadingOverlay = document.getElementById('treeLoadingOverlay');
    
    // Animation state
    this.animationId = null;
    this.isAnimating = false;
    
    // Tree state
    this.branches = [];
    this.leaves = [];
    this.currentBranch = 0;
    
    // Responsive canvas setup
    this.setupCanvas();
    
    // Handle window resize
    window.addEventListener('resize', () => this.setupCanvas());
    
    // Add click handlers for interactivity
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
  }

  setupCanvas() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size based on container
    this.width = Math.min(800, rect.width - 64);
    this.height = Math.min(500, this.width * 0.625);
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    
    // Make canvas interactive
    this.canvas.style.cursor = 'pointer';
  }

  async hashUserData(userData) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(userData));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.flatMap(byte =>
      byte.toString().padStart(3, '0').split('').map(Number)
    );
  }

  generateTreeStructure(hashDigits, complexity) {
    const nodes = [{
      x: this.width / 2,
      y: this.height - 30,
      angle: -90,
      length: Math.min(this.width, this.height) * 0.15,
      level: 0,
      thickness: Math.max(6, Math.min(this.width, this.height) * 0.01)
    }];
    
    const branches = [];
    const leaves = [];
    let nodeIndex = 0;
    const maxLevels = Math.min(8, 3 + Math.floor(Math.log(Math.max(1, complexity)) * 1.5));

    for (let level = 0; level < maxLevels && nodeIndex < nodes.length; level++) {
      const levelNodes = nodes.filter(n => n.level === level);
      
      levelNodes.forEach(parent => {
        if (nodeIndex >= nodes.length) return;
        nodeIndex++;
        
        const digit = hashDigits[level % hashDigits.length];
        const branchCount = Math.max(2, Math.min(4, 2 + (digit % 3)));
        const lengthReduction = 0.72 + (digit % 15) / 100;
        const thicknessReduction = 0.75;
        
        for (let b = 0; b < branchCount; b++) {
          const angleSpread = 35 + (digit % 25);
          const baseAngle = parent.angle - angleSpread / 2;
          const angle = baseAngle + (b * angleSpread) / Math.max(1, branchCount - 1);
          const length = parent.length * lengthReduction;
          const thickness = Math.max(1, parent.thickness * thicknessReduction);
          
          const angleVariation = (hashDigits[(level + b) % hashDigits.length] % 15) - 7;
          const finalAngle = angle + angleVariation;
          
          const rad = finalAngle * Math.PI / 180;
          const x2 = parent.x + length * Math.cos(rad);
          const y2 = parent.y + length * Math.sin(rad);
          
          if (x2 > 30 && x2 < this.width - 30 && y2 > 30) {
            const newNode = {
              x: x2, y: y2, angle: finalAngle, length, level: level + 1, thickness
            };
            nodes.push(newNode);
            
            const branch = {
              x1: parent.x, y1: parent.y, x2, y2, thickness, level: level + 1,
              progress: 0, maxProgress: 1
            };
            branches.push(branch);
            
            // Add leaves to terminal branches
            if (level >= maxLevels - 2 && Math.random() < 0.6) {
              leaves.push({
                x: x2 + Math.random() * 10 - 5,
                y: y2 + Math.random() * 10 - 5,
                size: 2 + Math.random() * 3,
                opacity: 0,
                sway: Math.random() * Math.PI * 2,
                color: this.getLeafColor(level)
              });
            }
          }
        }
      });
    }

    return { branches, nodes, leaves };
  }

  getLeafColor(level) {
    const colors = [
      '#22c55e', // Green
      '#16a34a', // Dark green
      '#84cc16', // Lime
      '#65a30d', // Olive
      '#eab308', // Yellow (autumn)
      '#f59e0b'  // Orange (autumn)
    ];
    return colors[level % colors.length];
  }

  async drawAnimatedTree(userData, complexity) {
    if (!this.canvas) return;
    
    this.showLoading(true);
    
    try {
      const hashDigits = await this.hashUserData(userData);
      const treeData = this.generateTreeStructure(hashDigits, Math.max(1, complexity));
      
      this.branches = treeData.branches;
      this.leaves = treeData.leaves;
      this.currentBranch = 0;
      
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackground();
      
      this.showLoading(false);
      
      // Start animation
      this.isAnimating = true;
      this.animateTree();
      
    } catch (error) {
      console.error('Error generating tree:', error);
      this.showLoading(false);
    }
  }

  drawBackground() {
    // Sky gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(1, '#e0f6ff');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.width, this.height * 0.7);
    
    // Ground gradient
    const groundGradient = this.ctx.createLinearGradient(0, this.height * 0.7, 0, this.height);
    groundGradient.addColorStop(0, '#8fbc8f');
    groundGradient.addColorStop(1, '#228b22');
    this.ctx.fillStyle = groundGradient;
    this.ctx.fillRect(0, this.height * 0.7, this.width, this.height * 0.3);
    
    // Add some grass texture
    this.ctx.fillStyle = '#32cd32';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.width;
      const y = this.height * 0.7 + Math.random() * this.height * 0.3;
      this.ctx.fillRect(x, y, 2, 8);
    }
  }

  animateTree() {
    if (!this.isAnimating) return;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    
    // Draw completed branches
    for (let i = 0; i < this.currentBranch; i++) {
      if (this.branches[i]) {
        this.drawBranch(this.branches[i], 1);
      }
    }
    
    // Draw current animating branch
    if (this.currentBranch < this.branches.length) {
      const branch = this.branches[this.currentBranch];
      branch.progress += 0.02;
      
      if (branch.progress >= 1) {
        branch.progress = 1;
        this.currentBranch++;
      }
      
      this.drawBranch(branch, branch.progress);
    }
    
    // Draw leaves with sway animation
    const time = Date.now() * 0.001;
    this.leaves.forEach(leaf => {
      if (this.currentBranch >= this.branches.length * 0.8) {
        leaf.opacity = Math.min(1, leaf.opacity + 0.02);
        const swayOffset = Math.sin(time + leaf.sway) * 2;
        this.drawLeaf(leaf.x + swayOffset, leaf.y, leaf.size, leaf.opacity, leaf.color);
      }
    });
    
    // Continue animation
    if (this.currentBranch < this.branches.length || this.leaves.some(l => l.opacity < 1)) {
      this.animationId = requestAnimationFrame(() => this.animateTree());
    } else {
      this.isAnimating = false;
      this.addInteractiveElements();
    }
  }

  drawBranch(branch, progress) {
    const { x1, y1, x2, y2, thickness, level } = branch;
    
    // Calculate partial coordinates based on progress
    const currentX2 = x1 + (x2 - x1) * progress;
    const currentY2 = y1 + (y2 - y1) * progress;
    
    const gradient = this.ctx.createLinearGradient(x1, y1, currentX2, currentY2);
    const greenIntensity = Math.max(0.4, 1 - level * 0.12);
    gradient.addColorStop(0, `rgba(101, 67, 33, ${greenIntensity})`); // Brown trunk
    gradient.addColorStop(1, `rgba(34, 139, 34, ${greenIntensity})`); // Green branches
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(currentX2, currentY2);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    this.ctx.stroke();
    
    this.ctx.shadowColor = 'transparent';
  }

  drawLeaf(x, y, size, opacity, color) {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size, size * 1.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  addInteractiveElements() {
    // Add floating particles
    this.particles = [];
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    
    this.animateParticles();
  }

  animateParticles() {
    if (!this.particles) return;
    
    // Update particles
    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Wrap around screen
      if (particle.x < 0) particle.x = this.width;
      if (particle.x > this.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.height;
      if (particle.y > this.height) particle.y = 0;
    });
    
    // Redraw scene
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    
    // Draw all branches
    this.branches.forEach(branch => this.drawBranch(branch, 1));
    
    // Draw leaves with sway
    const time = Date.now() * 0.001;
    this.leaves.forEach(leaf => {
      const swayOffset = Math.sin(time + leaf.sway) * 2;
      this.drawLeaf(leaf.x + swayOffset, leaf.y, leaf.size, leaf.opacity, leaf.color);
    });
    
    // Draw particles
    this.particles.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    
    requestAnimationFrame(() => this.animateParticles());
  }

  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add click effect
    this.addClickEffect(x, y);
  }

  handleCanvasHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if hovering over a leaf
    const hoveredLeaf = this.leaves.find(leaf => {
      const distance = Math.sqrt((x - leaf.x) ** 2 + (y - leaf.y) ** 2);
      return distance < leaf.size * 2;
    });
    
    this.canvas.style.cursor = hoveredLeaf ? 'pointer' : 'default';
  }

  addClickEffect(x, y) {
    // Create ripple effect
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      ripples.push({
        x, y,
        radius: 0,
        maxRadius: 30 + i * 10,
        opacity: 0.8 - i * 0.2,
        speed: 2 + i * 0.5
      });
    }
    
    const animateRipples = () => {
      this.ctx.save();
      ripples.forEach((ripple, index) => {
        ripple.radius += ripple.speed;
        ripple.opacity *= 0.95;
        
        if (ripple.radius < ripple.maxRadius && ripple.opacity > 0.01) {
          this.ctx.globalAlpha = ripple.opacity;
          this.ctx.strokeStyle = '#667eea';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          this.ctx.stroke();
        } else {
          ripples.splice(index, 1);
        }
      });
      this.ctx.restore();
      
      if (ripples.length > 0) {
        requestAnimationFrame(animateRipples);
      }
    };
    
    animateRipples();
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  showLoading(show) {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
  }

  // Export tree as high-quality image
  exportHighQuality() {
    const scale = 2; // 2x resolution
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    exportCanvas.width = this.width * scale;
    exportCanvas.height = this.height * scale;
    exportCtx.scale(scale, scale);
    
    // Redraw everything on export canvas
    this.drawBackgroundOnContext(exportCtx);
    this.branches.forEach(branch => this.drawBranchOnContext(exportCtx, branch, 1));
    
    const time = Date.now() * 0.001;
    this.leaves.forEach(leaf => {
      const swayOffset = Math.sin(time + leaf.sway) * 2;
      this.drawLeafOnContext(exportCtx, leaf.x + swayOffset, leaf.y, leaf.size, leaf.opacity, leaf.color);
    });
    
    return exportCanvas.toDataURL('image/png', 1.0);
  }

  drawBackgroundOnContext(ctx) {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(1, '#e0f6ff');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.height * 0.7);
    
    const groundGradient = ctx.createLinearGradient(0, this.height * 0.7, 0, this.height);
    groundGradient.addColorStop(0, '#8fbc8f');
    groundGradient.addColorStop(1, '#228b22');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, this.height * 0.7, this.width, this.height * 0.3);
  }

  drawBranchOnContext(ctx, branch, progress) {
    const { x1, y1, x2, y2, thickness, level } = branch;
    
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    const greenIntensity = Math.max(0.4, 1 - level * 0.12);
    gradient.addColorStop(0, `rgba(101, 67, 33, ${greenIntensity})`);
    gradient.addColorStop(1, `rgba(34, 139, 34, ${greenIntensity})`);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  drawLeafOnContext(ctx, x, y, size, opacity, color) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Enhanced Knowledge Tree Management
let knowledgeTreeGenerator;
let knowledgeTreeStats = {
  totalCards: 0,
  studySessions: 0,
  streakDays: 0,
  lastVisitCount: 0,
  masteredCards: 0,
  totalStudyTime: 0 // in minutes
};

// Initialize Knowledge Tree when user is authenticated
function initializeKnowledgeTree(user) {
  if (!user) return;
  
  knowledgeTreeGenerator = new KnowledgeTreeGenerator('knowledgeTreeCanvas');
  updateKnowledgeTreeStats();
}

function updateKnowledgeTreeStats() {
  // Integration with existing flashcard system
  if (typeof window.allFlashcards !== 'undefined' && window.allFlashcards) {
    knowledgeTreeStats.totalCards = window.allFlashcards.length;
  }
  
  // Enhanced stats from localStorage
  const savedStats = JSON.parse(localStorage.getItem('knowledgeTreeStats') || '{}');
  knowledgeTreeStats.studySessions = savedStats.studySessions || Math.floor(knowledgeTreeStats.totalCards / 5);
  knowledgeTreeStats.streakDays = savedStats.streakDays || Math.min(30, Math.floor(knowledgeTreeStats.totalCards / 10));
  knowledgeTreeStats.masteredCards = savedStats.masteredCards || Math.floor(knowledgeTreeStats.totalCards * 0.3);
  knowledgeTreeStats.totalStudyTime = savedStats.totalStudyTime || knowledgeTreeStats.studySessions * 15;
  
  // Update display with enhanced stats
  updateTreeStatsDisplay();
  
  // Check for growth and achievements
  checkForAchievements(savedStats);
  
  // Save current stats
  localStorage.setItem('knowledgeTreeStats', JSON.stringify({
    ...knowledgeTreeStats,
    lastVisitCount: knowledgeTreeStats.totalCards
  }));
}

function updateTreeStatsDisplay() {
  const statsElements = {
    'treeStatCards': knowledgeTreeStats.totalCards,
    'treeStatSessions': knowledgeTreeStats.studySessions,
    'treeStatStreak': knowledgeTreeStats.streakDays
  };
  
  // Enhanced stats if elements exist
  const enhancedStats = {
    'treeStatMastered': knowledgeTreeStats.masteredCards,
    'treeStatStudyTime': Math.floor(knowledgeTreeStats.totalStudyTime / 60) // Convert to hours
  };
  
  Object.entries({...statsElements, ...enhancedStats}).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value.toLocaleString();
    }
  });
}

function checkForAchievements(savedStats) {
  const achievements = [];
  
  // Check for milestones
  if (knowledgeTreeStats.totalCards >= 100 && (savedStats.totalCards || 0) < 100) {
    achievements.push('🎯 Century Scholar - 100 cards studied!');
  }
  
  if (knowledgeTreeStats.streakDays >= 30 && (savedStats.streakDays || 0) < 30) {
    achievements.push('🔥 Month Master - 30 day streak!');
  }
  
  if (knowledgeTreeStats.studySessions >= 50 && (savedStats.studySessions || 0) < 50) {
    achievements.push('📚 Dedicated Learner - 50 study sessions!');
  }
  
  // Show achievements
  achievements.forEach(achievement => {
    showTreeAchievement(achievement);
  });
  
  // Check for growth
  const lastCount = savedStats.lastVisitCount || 0;
  const newCards = knowledgeTreeStats.totalCards - lastCount;
  if (newCards > 0) {
    showTreeGrowthIndicator(newCards);
  }
}

function showTreeAchievement(achievement) {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-size: 1.5rem;">🏆</span>
      <span style="font-weight: 600;">Achievement Unlocked!</span>
    </div>
    <div style="margin-top: 0.5rem; opacity: 0.9;">${achievement}</div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    z-index: 1000;
    animation: slideInRight 0.5s ease, pulse 0.5s ease 0.5s;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    border: 2px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.5s ease forwards';
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

function showTreeGrowthIndicator(newCards) {
  const indicator = document.getElementById('treeGrowthIndicator');
  const countElement = document.getElementById('treeNewCardsCount');
  
  if (indicator && countElement) {
    countElement.textContent = newCards;
    indicator.style.display = 'block';
    
    // Add animation
    indicator.style.animation = 'fadeInUp 0.5s ease';
    
    setTimeout(() => {
      indicator.style.animation = 'fadeOut 0.5s ease forwards';
      setTimeout(() => {
        indicator.style.display = 'none';
        indicator.style.animation = '';
      }, 500);
    }, 5000);
  }
}

// Enhanced Firestore integration
async function updateKnowledgeTreeStatsFromFirestore() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    // Fetch cards with enhanced data
    const cardsSnap = await firebase.firestore().collection('flashcards')
      .where('userId', '==', user.uid)
      .get();
    
    knowledgeTreeStats.totalCards = cardsSnap.size;
    
    // Calculate mastered cards (cards studied multiple times)
    let masteredCount = 0;
    cardsSnap.forEach(doc => {
      const data = doc.data();
      if (data.studyCount && data.studyCount >= 3) {
        masteredCount++;
      }
    });
    knowledgeTreeStats.masteredCards = masteredCount;

    // Fetch user stats
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      knowledgeTreeStats.studySessions = data.studySessions || 0;
      knowledgeTreeStats.streakDays = data.streakDays || 0;
      knowledgeTreeStats.totalStudyTime = data.totalStudyTime || 0;
    }

    updateTreeStatsDisplay();
    
    // Check for achievements
    const savedStats = JSON.parse(localStorage.getItem('knowledgeTreeStats') || '{}');
    checkForAchievements(savedStats);

    // Save updated stats
    localStorage.setItem('knowledgeTreeStats', JSON.stringify({
      ...knowledgeTreeStats,
      lastVisitCount: knowledgeTreeStats.totalCards
    }));
    
  } catch (error) {
    console.error('Error updating tree stats:', error);
  }
}

// Enhanced UI Functions
async function toggleKnowledgeTree() {
  const content = document.getElementById('knowledgeTreeContent');
  const toggleBtn = document.getElementById('toggleTreeSection');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggleBtn.innerHTML = '▲ Hide Knowledge Tree';
    
    // Initialize tree if not already done
    if (!knowledgeTreeGenerator) {
      if (firebase && firebase.auth && firebase.auth().currentUser) {
        initializeKnowledgeTree(firebase.auth().currentUser);
      }
    }
    
    // Update stats from Firestore
    await updateKnowledgeTreeStatsFromFirestore();
    
    // Generate tree with enhanced complexity calculation
    if (knowledgeTreeGenerator) {
      const userData = {
        uid: firebase.auth().currentUser?.uid || 'anonymous',
        timestamp: Date.now(),
        variation: Math.random(),
        sessionCount: knowledgeTreeStats.studySessions,
        masteredCards: knowledgeTreeStats.masteredCards
      };
      
      const complexity = Math.max(1, 
        knowledgeTreeStats.totalCards + 
        knowledgeTreeStats.studySessions * 2 + 
        knowledgeTreeStats.masteredCards * 3
      );
      
      knowledgeTreeGenerator.drawAnimatedTree(userData, complexity);
    }
  } else {
    content.style.display = 'none';
    toggleBtn.innerHTML = '▼ View Your Knowledge Tree';
    
    // Stop any running animations
    if (knowledgeTreeGenerator) {
      knowledgeTreeGenerator.stopAnimation();
    }
  }
}

async function regenerateKnowledgeTree() {
  if (!knowledgeTreeGenerator) return;
  
  const userData = {
    uid: firebase.auth().currentUser?.uid || 'anonymous',
    seed: Date.now(),
    variation: Math.random(),
    sessionCount: knowledgeTreeStats.studySessions,
    masteredCards: knowledgeTreeStats.masteredCards
  };
  
  const complexity = Math.max(1, 
    knowledgeTreeStats.totalCards + 
    knowledgeTreeStats.studySessions * 2 + 
    knowledgeTreeStats.masteredCards * 3
  );
  
  await knowledgeTreeGenerator.drawAnimatedTree(userData, complexity);
}

async function shareKnowledgeTree() {
  const url = window.location.href;
  const text = `🌳 Check out my Knowledge Tree! I've mastered ${knowledgeTreeStats.totalCards} flashcards and maintained a ${knowledgeTreeStats.streakDays}-day streak! ${url}`;

  // Try Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Knowledge Tree',
        text: text,
        url: url
      });
    } catch (err) {
      console.error('Sharing failed:', err);
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      alert('Share message copied to clipboard! 📋');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      alert('Failed to share. Please copy manually:\n\n' + text);
    }
  }
}
