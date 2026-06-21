/* =========================================
   AI Health Assistant — script.js
   Handles: auth state, navigation, forms,
   symptom analysis, results rendering
   ========================================= */

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────

const Storage = {
  getProfile: () => JSON.parse(localStorage.getItem('aha_profile') || 'null'),
  setProfile: (data) => localStorage.setItem('aha_profile', JSON.stringify(data)),
  getSymptoms: () => JSON.parse(localStorage.getItem('aha_symptoms') || 'null'),
  setSymptoms: (data) => localStorage.setItem('aha_symptoms', JSON.stringify(data)),
  clear: () => { 
    localStorage.removeItem('aha_profile'); 
    localStorage.removeItem('aha_symptoms'); 
    localStorage.removeItem('aha_ai_result'); // Clear AI memory too
  }
};

// ─── TOAST NOTIFICATION ──────────────────────────────────────────────────────

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ─── MOBILE HAMBURGER MENU ───────────────────────────────────────────────────

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
}

// ─── LOGOUT ─────────────────────────────────────────────────────────────────

function handleLogout() {
  Storage.clear();
  showToast('You have been signed out.');
  setTimeout(() => window.location.href = 'index.html', 1000);
}

// ─── HOMEPAGE ────────────────────────────────────────────────────────────────

function initHomepage() {
  const profile = Storage.getProfile();
  const loginBtn   = document.getElementById('login-btn');
  const loginBtnMobile = document.getElementById('login-btn-mobile');
  const heroBtn    = document.getElementById('hero-cta-btn');
  const welcomeEl  = document.getElementById('nav-welcome');
  const logoutBtns = document.querySelectorAll('.logout-btn');

  if (profile) {
    if (loginBtn) { loginBtn.textContent = 'Start Analysis'; loginBtn.href = 'symptoms.html'; }
    if (loginBtnMobile) { loginBtnMobile.textContent = 'Start Analysis'; loginBtnMobile.href = 'symptoms.html'; }
    if (heroBtn) { heroBtn.textContent = '▶  Continue My Analysis'; heroBtn.href = 'symptoms.html'; }
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome back, ${profile.fullName.split(' ')[0]} 👋`;
      welcomeEl.style.display = 'inline-flex';
    }
    logoutBtns.forEach(btn => { btn.style.display = 'inline-flex'; });
  } else {
    if (welcomeEl) welcomeEl.style.display = 'none';
    logoutBtns.forEach(btn => { btn.style.display = 'none'; });
  }

  logoutBtns.forEach(btn => btn.addEventListener('click', handleLogout));
}

// ─── LOGIN / REGISTER PAGE ───────────────────────────────────────────────────

function calcAgeFromDob(dobValue) {
  if (!dobValue) return '';
  const today = new Date();
  const birth = new Date(dobValue);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : 0;
}

function initLoginPage() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  const dobInput = form.elements['dob'];
  const ageInput = form.elements['age'];

  if (dobInput && ageInput) {
    dobInput.addEventListener('change', () => { ageInput.value = calcAgeFromDob(dobInput.value); });
  }

  const existing = Storage.getProfile();
  if (existing) {
    Object.keys(existing).forEach(key => {
      const el = form.elements[key];
      if (el) el.value = existing[key];
    });
    const heading = document.getElementById('form-heading');
    if (heading) heading.textContent = 'Update Your Profile';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const required = ['fullName', 'dob', 'gender'];
    for (const field of required) {
      if (!form.elements[field] || !form.elements[field].value.trim()) {
        showToast(`Please fill in your ${field === 'dob' ? 'date of birth' : field}.`);
        form.elements[field] && form.elements[field].focus();
        return;
      }
    }

    const computedAge = calcAgeFromDob(form.elements['dob'].value);
    const profile = {
      fullName:    form.elements['fullName'].value.trim(),
      dob:         form.elements['dob'].value,
      age:         computedAge,
      gender:      form.elements['gender'].value,
      conditions:  form.elements['conditions'].value.trim(),
      allergies:   form.elements['allergies'].value.trim(),
      medications: form.elements['medications'].value.trim(),
      createdAt:   new Date().toISOString()
    };

    Storage.setProfile(profile);
    showToast('Profile saved! Redirecting…');
    setTimeout(() => window.location.href = 'symptoms.html', 1200);
  });
}

// ─── SYMPTOMS PAGE (LIVE AI INTEGRATION) ─────────────────────────────────────

function initSymptomsPage() {
  const profile = Storage.getProfile();
  if (!profile) { window.location.href = 'login.html'; return; }

  // Populate profile banner
  const nameEl = document.getElementById('banner-name');
  const ageGender = document.getElementById('banner-age-gender');
  const condEl = document.getElementById('banner-conditions');
  const allergyEl = document.getElementById('banner-allergies');
  const avatar = document.getElementById('banner-avatar');

  if (nameEl) nameEl.textContent = profile.fullName;
  if (ageGender) ageGender.textContent = `${profile.age} yrs • ${profile.gender}`;
  if (avatar) avatar.textContent = profile.fullName.charAt(0).toUpperCase();

  if (condEl) {
    if (profile.conditions) {
      const pills = profile.conditions.split(',').map(c => c.trim()).filter(Boolean);
      condEl.innerHTML = pills.map(c => `<span class="condition-pill">${c}</span>`).join('');
    } else {
      condEl.innerHTML = '<span class="condition-pill">None reported</span>';
    }
  }

  if (allergyEl) allergyEl.textContent = profile.allergies || 'None';

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const form = document.getElementById('symptom-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const symptoms = form.elements['symptoms'].value.trim();
    const duration = form.elements['duration'].value.trim();
    const severityElement = document.querySelector('input[name="severity"]:checked');
    const severity = severityElement ? severityElement.value : 'Not specified';
    const notes = form.elements['notes'].value.trim();

    if (!symptoms) { showToast('Please describe your symptoms.'); return; }
    if (!duration) { showToast('Please enter the duration.'); return; }
    if (!severityElement) { showToast('Please select a severity level.'); return; }

    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.innerHTML = '⏳ Analyzing with AI...';
      analyzeBtn.disabled = true;
    }

    // Save history
    Storage.setSymptoms({ symptoms, duration, severity, notes, timestamp: new Date().toISOString() });

    // === LIVE AI CALL ===
    const url = "https://router.huggingface.co/v1/chat/completions";
    const HF_TOKEN = "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"; // ⚠️ PASTE YOUR HUGGING FACE TOKEN HERE

    const patientProfile = `
      Patient Info: ${profile.age} year old ${profile.gender}. 
      Existing Conditions: ${profile.conditions || 'None'}. 
      Allergies: ${profile.allergies || 'None'}.
      Symptoms: ${symptoms}
      Duration: ${duration}
      Severity: ${severity}
      Notes: ${notes}
    `;

    const systemInstruction = `You are an AI health triage assistant. Analyze the patient profile. Return ONLY valid JSON matching exactly this structure:
    {
      "risk_level": "low", 
      "confidence": 85,
      "possible_conditions": [
        { "name": "Condition A", "prob": "75%", "desc": "Brief reason why it matches." }
      ],
      "symptom_summary": "A 2-sentence summary of the patient's state.",
      "action_steps": ["Step 1", "Step 2"]
    }
    Rule: risk_level must be exactly "low", "medium", or "high".`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: patientProfile }
          ],
          max_tokens: 500
        }),
      });

      if (!response.ok) throw new Error("API call failed.");

      const data = await response.json();
      let cleanText = data.choices[0].message.content.trim();
      
      const start = cleanText.indexOf('{');
      const end = cleanText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleanText = cleanText.substring(start, end + 1);
      }

      // Save AI result and move pages
      localStorage.setItem('aha_ai_result', cleanText);
      window.location.href = 'results.html';

    } catch (error) {
      console.error(error);
      showToast("AI processing failed. Check network or token.");
      if (analyzeBtn) {
        analyzeBtn.innerHTML = '🔍 Analyse My Symptoms';
        analyzeBtn.disabled = false;
      }
    }
  });
}

// ─── RESULTS PAGE (LIVE AI RENDERING) ────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function initResultsPage() {
  const profile  = Storage.getProfile();
  const symptoms = Storage.getSymptoms();
  const aiDataRaw = localStorage.getItem('aha_ai_result');

  if (!profile || !symptoms || !aiDataRaw) {
    window.location.href = 'symptoms.html';
    return;
  }

  let analysis;
  try {
    analysis = JSON.parse(aiDataRaw);
  } catch (e) {
    console.error("Failed to parse AI data", e);
    return;
  }

  // Symptom Summary UI
  const summaryEl = document.getElementById('symptom-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-row" style="margin-bottom: 15px;"><em>${analysis.symptom_summary}</em></div>
      <div class="summary-row"><span class="summary-key">Symptoms</span><span class="summary-val">${symptoms.symptoms}</span></div>
      <div class="summary-row"><span class="summary-key">Duration</span><span class="summary-val">${symptoms.duration}</span></div>
      <div class="summary-row"><span class="summary-key">Severity</span><span class="summary-val" style="text-transform:capitalize">${symptoms.severity}</span></div>
      ${symptoms.notes ? `<div class="summary-row"><span class="summary-key">Notes</span><span class="summary-val">${symptoms.notes}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">Analysed</span><span class="summary-val">${formatDate(symptoms.timestamp)}</span></div>
    `;
  }

  // Risk Level UI
  const riskEl = document.getElementById('risk-level');
  if (riskEl) {
    const riskMap = { low: '🟢 Low Risk', medium: '🟡 Medium Risk', high: '🔴 High Risk' };
    const riskCls = { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' };
    const normalizedRisk = (analysis.risk_level || 'medium').toLowerCase();
    riskEl.innerHTML = `<span class="risk-badge ${riskCls[normalizedRisk]}">${riskMap[normalizedRisk]}</span>`;
  }

  // Confidence UI
  const confNumEl  = document.getElementById('confidence-num');
  const confFillEl = document.getElementById('confidence-fill');
  if (confNumEl) confNumEl.textContent = `${analysis.confidence}%`;
  if (confFillEl) {
    confFillEl.style.width = '0%';
    setTimeout(() => { confFillEl.style.width = `${analysis.confidence}%`; }, 300);
  }

  // Conditions UI
  const condListEl = document.getElementById('conditions-list');
  if (condListEl && analysis.possible_conditions) {
    condListEl.innerHTML = analysis.possible_conditions.map(c => `
      <div class="condition-item">
        <div>
          <div class="condition-item-name">${c.name}</div>
          <div class="condition-item-desc">${c.desc}</div>
        </div>
        <div class="condition-item-prob">${c.prob || ''}</div>
      </div>
    `).join('');
  }

  // Action Steps UI
  const actionsEl = document.getElementById('action-steps');
  if (actionsEl && analysis.action_steps) {
    actionsEl.innerHTML = analysis.action_steps.map((a, i) => `
      <div class="action-step">
        <div class="action-step-num">${i + 1}</div>
        <div class="action-step-text">${a}</div>
      </div>
    `).join('');
  }

  // Header Info
  const patientEl = document.getElementById('results-patient');
  if (patientEl) patientEl.textContent = `${profile.fullName} · ${profile.age} yrs · ${profile.gender}`;

  // Button Listeners
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const newBtn = document.getElementById('new-analysis-btn');
  if (newBtn) newBtn.addEventListener('click', () => {
    localStorage.removeItem('aha_ai_result'); // clear old result
    window.location.href = 'symptoms.html';
  });
}

// ─── PAGE ROUTER ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHamburger();

  const page = document.body.dataset.page;
  if (page === 'home')     initHomepage();
  if (page === 'login')    initLoginPage();
  if (page === 'symptoms') initSymptomsPage();
  if (page === 'results')  initResultsPage();
});