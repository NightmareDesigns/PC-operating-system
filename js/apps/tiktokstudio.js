/**
 * NightmareOS — TikTok AI Studio
 * AI-powered TikTok content creator and auto-poster.
 * Generates scripts, captions, hashtags and schedules automatic posts.
 */

'use strict';

(function () {
  /* ── Constants ─────────────────────────────────────────────────── */
  var STORAGE_KEY = 'nightos_tiktok_studio';

  var NICHES = [
    'Tech & Gadgets', 'Lifestyle', 'Comedy & Skits', 'Educational',
    'Gaming', 'Cooking & Food', 'Fitness & Health', 'Travel',
    'Fashion & Beauty', 'Motivation', 'DIY & Crafts', 'Music',
  ];

  var CONTENT_TEMPLATES = {
    'Tech & Gadgets': [
      { hook: '🔥 This $20 gadget CHANGED my life!', points: ['What it does', 'Why it\'s useful', 'Where to buy it'], cta: 'Drop a 🔥 if you want a review!' },
      { hook: '⚡ You\'re using your phone WRONG. Here\'s how to fix it:', points: ['Hidden setting #1', 'Hidden setting #2', 'Hidden setting #3'], cta: 'Save this before they remove it!' },
      { hook: '🤯 AI just made this impossible task easy in 10 seconds:', points: ['The old manual way', 'How AI solves it', 'Free tool to try now'], cta: 'Follow for more AI tips!' },
    ],
    'Lifestyle': [
      { hook: '✨ My 5am morning routine that changed everything:', points: ['Hydrate immediately', 'No phone for 30 min', 'Journal + visualize'], cta: 'Tell me your morning routine below!' },
      { hook: '💡 Habits I wish I started at 20:', points: ['Invest early', 'Read 10 pages daily', 'Say no more often'], cta: 'Which one resonates with you?' },
      { hook: '🌟 How I went from broke to financially free:', points: ['Cut unnecessary expenses', 'Multiple income streams', 'Invest consistently'], cta: 'Follow for financial tips!' },
    ],
    'Comedy & Skits': [
      { hook: '😂 POV: You\'re the smartest person in the room…', points: ['Set up the scene', 'Build the tension', 'Unexpected punchline'], cta: 'Tag someone who needs to see this 😭' },
      { hook: '💀 When your code finally works after 6 hours:', points: ['The struggle', 'The breakthrough', 'The celebration'], cta: 'Devs, you know the feeling 😂' },
      { hook: '🤣 Things only [relatable group] will understand:', points: ['Situation 1', 'Situation 2', 'Situation 3'], cta: 'Are you guilty of this? 👇' },
    ],
    'Educational': [
      { hook: '📚 3 psychology tricks that will blow your mind:', points: ['The decoy effect', 'Loss aversion bias', 'Social proof principle'], cta: 'Follow for daily psychology facts!' },
      { hook: '🧠 The science of learning faster:', points: ['Active recall beats re-reading', 'Spaced repetition method', 'Teach it to learn it'], cta: 'Save this for your next study session!' },
      { hook: '🌍 A history fact nobody taught you in school:', points: ['The surprising context', 'The real story', 'Why it matters today'], cta: 'Did you know this? Comment below!' },
    ],
    'Gaming': [
      { hook: '🎮 This glitch makes you INVISIBLE in [game]:', points: ['How to trigger it', 'Best spots to use it', 'Avoid getting patched out'], cta: 'Like before they patch this out! 🔥' },
      { hook: '⚔️ Top 3 settings PRO gamers use:', points: ['Sensitivity settings', 'Graphics optimization', 'Custom keybinds'], cta: 'Drop your username for a 1v1! 👇' },
      { hook: '🏆 How I ranked up in ONE week:', points: ['The mindset shift', 'Daily practice routine', 'Key skills to master'], cta: 'Follow for more rank-up tips!' },
    ],
    'Cooking & Food': [
      { hook: '🍕 This ONE ingredient makes everything taste better:', points: ['What the ingredient is', 'How to use it', 'Recipes to try it in'], cta: 'Save this to try tonight!' },
      { hook: '👨‍🍳 Chef\'s secrets restaurants don\'t want you to know:', points: ['Secret #1: Butter everything', 'Secret #2: High heat searing', 'Secret #3: Rest your meat'], cta: 'Which tip surprised you most?' },
      { hook: '⏱️ 5-ingredient meal under 15 minutes:', points: ['Ingredients list', 'Step by step method', 'Pro tips'], cta: 'Save for your meal prep Sunday!' },
    ],
    'Fitness & Health': [
      { hook: '💪 The ONLY 3 exercises you actually need:', points: ['Compound lift #1', 'Compound lift #2', 'Compound lift #3'], cta: 'Follow for science-backed fitness tips!' },
      { hook: '🏃 How I lost 20lbs without starving myself:', points: ['Changed what I ate', 'Simple daily habits', 'Consistency over perfection'], cta: 'Drop a 💪 if this helped!' },
      { hook: '🧘 Signs you\'re overtraining (and what to do):', points: ['Sign #1: Always tired', 'Sign #2: Performance drops', 'Fix: Deload week'], cta: 'Recovery is gains! Save this.' },
    ],
    'Travel': [
      { hook: '✈️ I found a HIDDEN gem most tourists miss in [city]:', points: ['How I found it', 'What makes it special', 'Best time to visit'], cta: 'Save for your next trip! 🗺️' },
      { hook: '💰 How to travel to Europe for under $500:', points: ['Cheap flight hacks', 'Budget accommodation tips', 'Free attractions list'], cta: 'Follow for more travel hacks!' },
      { hook: '🌏 3 countries every traveler should visit:', points: ['Country 1 and why', 'Country 2 and why', 'Country 3 and why'], cta: 'Which one is on your bucket list?' },
    ],
    'Fashion & Beauty': [
      { hook: '👗 3 outfits from 5 pieces (capsule wardrobe hack):', points: ['The 5 essential pieces', 'Outfit combination 1', 'Outfit combination 2'], cta: 'Save for your next shopping trip!' },
      { hook: '💄 The skincare routine dermatologists actually use:', points: ['Morning routine', 'Evening routine', 'Weekly treatments'], cta: 'What\'s your skincare must-have? 👇' },
      { hook: '🛍️ Thrift flip: $5 → $50 look:', points: ['What I found', 'How I transformed it', 'Final result reveal'], cta: 'Follow for more thrift flips!' },
    ],
    'Motivation': [
      { hook: '🔥 Stop waiting for the right moment. Here\'s why:', points: ['The truth about timing', 'What you\'re actually afraid of', 'Action beats perfection'], cta: 'Share with someone who needs this! 💫' },
      { hook: '💎 Advice from my future self to my past self:', points: ['Lesson 1: Trust the process', 'Lesson 2: Invest in yourself', 'Lesson 3: Your network is your net worth'], cta: 'What would you tell your past self?' },
      { hook: '⚡ The mindset shift that changed my life in 24 hours:', points: ['What I believed before', 'The moment of clarity', 'How I think now'], cta: 'Follow for daily mindset fuel! 🚀' },
    ],
    'DIY & Crafts': [
      { hook: '🔨 I built this for under $30 (full tutorial):', points: ['Materials needed', 'Step by step process', 'Final result + tips'], cta: 'Save this project for the weekend!' },
      { hook: '♻️ Don\'t throw that away! Turn it into THIS:', points: ['What most people discard', 'Simple transformation steps', 'Amazing end result'], cta: 'What would you make with it? 👇' },
      { hook: '🎨 5-minute craft that looks like it took hours:', points: ['Supplies you need', 'The quick technique', 'Pro finishing tips'], cta: 'Try this and tag me! 🎨' },
    ],
    'Music': [
      { hook: '🎵 This song has been living in my head rent-free:', points: ['The artist and track', 'Why it hits differently', 'Similar songs you\'ll love'], cta: 'What\'s on repeat for you? 👇' },
      { hook: '🎸 Learn this riff in 60 seconds:', points: ['The notes breakdown', 'Slow motion demo', 'Full speed play-through'], cta: 'Follow for daily guitar tips!' },
      { hook: '🎤 Vocal warm-up pros use before performing:', points: ['Breathing exercise', 'Lip trills technique', 'Scale progression'], cta: 'Save for your next performance!' },
    ],
  };

  var HASHTAG_POOLS = {
    'Tech & Gadgets':    ['#tech', '#gadgets', '#techreview', '#gadgetreview', '#technology', '#techtok', '#gadgettok', '#techlife', '#innovation', '#digitallife'],
    'Lifestyle':         ['#lifestyle', '#selfimprovement', '#lifehacks', '#habits', '#morningroutine', '#lifestyletok', '#motivation', '#personaldevelopment', '#mindset', '#success'],
    'Comedy & Skits':    ['#comedy', '#funny', '#relatable', '#skit', '#comedytok', '#humor', '#lol', '#foryou', '#fyp', '#viral'],
    'Educational':       ['#educational', '#learnontiktok', '#didyouknow', '#facts', '#sciencetok', '#psychology', '#history', '#education', '#learning', '#knowledge'],
    'Gaming':            ['#gaming', '#gamer', '#gamertok', '#videogames', '#games', '#pcgaming', '#gamingtok', '#esports', '#gamerlife', '#streamer'],
    'Cooking & Food':    ['#cooking', '#food', '#recipe', '#foodtok', '#cookingtips', '#foodie', '#homecooking', '#easyrecipe', '#foodhacks', '#chef'],
    'Fitness & Health':  ['#fitness', '#workout', '#gym', '#health', '#fitnessjourney', '#fitnesstok', '#exercise', '#gymtok', '#healthy', '#bodybuilding'],
    'Travel':            ['#travel', '#traveltok', '#wanderlust', '#adventure', '#travellife', '#explore', '#vacation', '#travelgram', '#travelguide', '#bucketlist'],
    'Fashion & Beauty':  ['#fashion', '#beauty', '#style', '#ootd', '#fashiontok', '#makeup', '#skincare', '#beautytok', '#outfitideas', '#fashionadvice'],
    'Motivation':        ['#motivation', '#mindset', '#inspiration', '#success', '#motivationtok', '#positivity', '#growthmindset', '#motivational', '#goals', '#hustle'],
    'DIY & Crafts':      ['#diy', '#crafts', '#diytok', '#crafting', '#homemade', '#upcycle', '#handmade', '#diyproject', '#crafttok', '#makerlife'],
    'Music':             ['#music', '#musictok', '#musician', '#guitar', '#singing', '#musicvideo', '#musiclover', '#newmusic', '#musicproducer', '#artist'],
  };

  var DURATIONS = ['15s', '30s', '60s', '3 min'];
  var POST_TIMES = ['06:00', '09:00', '12:00', '15:00', '18:00', '20:00', '21:00', '22:00'];

  /* ── State ──────────────────────────────────────────────────────── */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { posts: [], scheduledPosts: [], accountName: '@nightmare_ai', niche: 'Tech & Gadgets', autoPost: false };
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ── Helpers ────────────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function randomHashtags(niche, count) {
    var pool = HASHTAG_POOLS[niche] || HASHTAG_POOLS['Tech & Gadgets'];
    return shuffle(pool).slice(0, count).join(' ');
  }

  function generateContent(niche) {
    var templates = CONTENT_TEMPLATES[niche] || CONTENT_TEMPLATES['Tech & Gadgets'];
    var tpl = templates[rand(0, templates.length - 1)];
    var hashtags = randomHashtags(niche, 6) + ' #fyp #foryoupage #viral';
    var duration = DURATIONS[rand(0, DURATIONS.length - 1)];
    return {
      hook:     tpl.hook,
      points:   tpl.points.slice(),
      cta:      tpl.cta,
      hashtags: hashtags,
      niche:    niche,
      duration: duration,
      id:       Date.now() + '_' + rand(1000, 9999),
    };
  }

  function simulateStats() {
    return {
      views:   rand(1000, 500000),
      likes:   rand(100, 50000),
      shares:  rand(10, 5000),
      comments: rand(20, 2000),
    };
  }

  /* ── UI Builder ─────────────────────────────────────────────────── */
  function buildUI() {
    return [
      '<div class="ttk-app">',
      '  <div class="ttk-header">',
      '    <span class="ttk-logo">🎵</span>',
      '    <span class="ttk-brand">TikTok AI Studio</span>',
      '    <span class="ttk-account" id="ttk-account-label">@nightmare_ai</span>',
      '  </div>',
      '  <div class="ttk-tabs" role="tablist">',
      '    <button class="ttk-tab active" data-tab="generate" role="tab" aria-selected="true">✨ Generate</button>',
      '    <button class="ttk-tab" data-tab="feed" role="tab" aria-selected="false">📱 Feed</button>',
      '    <button class="ttk-tab" data-tab="schedule" role="tab" aria-selected="false">📅 Schedule</button>',
      '    <button class="ttk-tab" data-tab="analytics" role="tab" aria-selected="false">📊 Analytics</button>',
      '    <button class="ttk-tab" data-tab="settings" role="tab" aria-selected="false">⚙️ Settings</button>',
      '  </div>',
      '  <div class="ttk-body">',
      '    <div class="ttk-panel active" id="ttk-panel-generate">',
      '      <div class="ttk-gen-controls">',
      '        <label class="ttk-label">Content Niche</label>',
      '        <select class="ttk-select" id="ttk-niche-sel">',
      NICHES.map(function (n) { return '          <option value="' + escHtml(n) + '">' + escHtml(n) + '</option>'; }).join('\n'),
      '        </select>',
      '        <button class="ttk-btn-primary" id="ttk-generate-btn">🤖 Generate AI Content</button>',
      '      </div>',
      '      <div class="ttk-preview" id="ttk-preview">',
      '        <div class="ttk-preview-empty">',
      '          <div class="ttk-preview-icon">🤖</div>',
      '          <div class="ttk-preview-hint">Select a niche and click Generate to create AI content</div>',
      '        </div>',
      '      </div>',
      '      <div class="ttk-gen-actions" id="ttk-gen-actions" style="display:none">',
      '        <button class="ttk-btn-secondary" id="ttk-regenerate-btn">🔄 Regenerate</button>',
      '        <button class="ttk-btn-primary" id="ttk-post-now-btn">🚀 Post Now</button>',
      '        <button class="ttk-btn-outline" id="ttk-schedule-post-btn">📅 Schedule</button>',
      '      </div>',
      '    </div>',
      '    <div class="ttk-panel" id="ttk-panel-feed">',
      '      <div class="ttk-auto-row">',
      '        <span class="ttk-auto-label">🤖 Auto-Post</span>',
      '        <label class="ttk-toggle">',
      '          <input type="checkbox" id="ttk-auto-toggle">',
      '          <span class="ttk-toggle-track"><span class="ttk-toggle-thumb"></span></span>',
      '        </label>',
      '        <span class="ttk-auto-status" id="ttk-auto-status">OFF</span>',
      '      </div>',
      '      <div class="ttk-feed" id="ttk-feed"></div>',
      '    </div>',
      '    <div class="ttk-panel" id="ttk-panel-schedule">',
      '      <div class="ttk-schedule-form">',
      '        <label class="ttk-label">Niche for Scheduled Post</label>',
      '        <select class="ttk-select" id="ttk-sched-niche">',
      NICHES.map(function (n) { return '          <option value="' + escHtml(n) + '">' + escHtml(n) + '</option>'; }).join('\n'),
      '        </select>',
      '        <label class="ttk-label">Schedule Time</label>',
      '        <select class="ttk-select" id="ttk-sched-time">',
      POST_TIMES.map(function (t) { return '          <option value="' + t + '">' + t + '</option>'; }).join('\n'),
      '        </select>',
      '        <label class="ttk-label">Days</label>',
      '        <div class="ttk-day-picker" id="ttk-day-picker">',
      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function (d) {
        return '          <button class="ttk-day-btn" data-day="' + d + '">' + d + '</button>';
      }).join('\n'),
      '        </div>',
      '        <button class="ttk-btn-primary" id="ttk-add-sched-btn">➕ Add Schedule</button>',
      '      </div>',
      '      <div class="ttk-sched-list" id="ttk-sched-list"></div>',
      '    </div>',
      '    <div class="ttk-panel" id="ttk-panel-analytics">',
      '      <div class="ttk-analytics" id="ttk-analytics"></div>',
      '    </div>',
      '    <div class="ttk-panel" id="ttk-panel-settings">',
      '      <div class="ttk-settings-form">',
      '        <label class="ttk-label">TikTok Account Name</label>',
      '        <input type="text" class="ttk-input" id="ttk-account-input" placeholder="@youraccount" maxlength="50">',
      '        <label class="ttk-label">Default Niche</label>',
      '        <select class="ttk-select" id="ttk-default-niche">',
      NICHES.map(function (n) { return '          <option value="' + escHtml(n) + '">' + escHtml(n) + '</option>'; }).join('\n'),
      '        </select>',
      '        <label class="ttk-label">Post Frequency (posts/day when auto-post is on)</label>',
      '        <select class="ttk-select" id="ttk-freq-sel">',
      '          <option value="1">1 post/day</option>',
      '          <option value="2">2 posts/day</option>',
      '          <option value="3" selected>3 posts/day</option>',
      '          <option value="5">5 posts/day</option>',
      '        </select>',
      '        <button class="ttk-btn-primary" id="ttk-save-settings-btn">💾 Save Settings</button>',
      '        <button class="ttk-btn-danger" id="ttk-clear-btn">🗑️ Clear All Data</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  /* ── Init ───────────────────────────────────────────────────────── */
  function init(el, state) {
    var currentContent = null;
    var autoInterval   = null;

    /* --- Tabs --- */
    el.querySelectorAll('.ttk-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        el.querySelectorAll('.ttk-tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        el.querySelectorAll('.ttk-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        var panel = el.querySelector('#ttk-panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
        if (tab.dataset.tab === 'feed')      renderFeed(el, state);
        if (tab.dataset.tab === 'schedule')  renderSchedule(el, state);
        if (tab.dataset.tab === 'analytics') renderAnalytics(el, state);
        if (tab.dataset.tab === 'settings')  renderSettings(el, state);
      });
    });

    /* --- Niche selector default --- */
    var nicheSel = el.querySelector('#ttk-niche-sel');
    nicheSel.value = state.niche;

    /* --- Generate button --- */
    el.querySelector('#ttk-generate-btn').addEventListener('click', function () {
      var niche = nicheSel.value;
      currentContent = generateContent(niche);
      renderPreview(el, currentContent);
      el.querySelector('#ttk-gen-actions').style.display = 'flex';
    });

    /* --- Regenerate button --- */
    el.querySelector('#ttk-regenerate-btn').addEventListener('click', function () {
      var niche = nicheSel.value;
      currentContent = generateContent(niche);
      renderPreview(el, currentContent);
    });

    /* --- Post Now --- */
    el.querySelector('#ttk-post-now-btn').addEventListener('click', function () {
      if (!currentContent) return;
      var post = {
        id:        currentContent.id,
        content:   currentContent,
        postedAt:  new Date().toISOString(),
        status:    'posted',
        stats:     simulateStats(),
      };
      state.posts.unshift(post);
      saveState(state);
      showToast(el, '🚀 Posted to TikTok successfully!');
      currentContent = null;
      el.querySelector('#ttk-gen-actions').style.display = 'none';
      el.querySelector('#ttk-preview').innerHTML = [
        '<div class="ttk-preview-empty">',
        '  <div class="ttk-preview-icon">✅</div>',
        '  <div class="ttk-preview-hint">Content posted! Generate more content or check your Feed.</div>',
        '</div>'
      ].join('');
    });

    /* --- Schedule post from Generate tab --- */
    el.querySelector('#ttk-schedule-post-btn').addEventListener('click', function () {
      if (!currentContent) return;
      var time = POST_TIMES[rand(0, POST_TIMES.length - 1)];
      var scheduled = {
        id:       currentContent.id,
        content:  currentContent,
        time:     time,
        days:     ['Mon', 'Wed', 'Fri'],
        status:   'scheduled',
      };
      state.scheduledPosts.unshift(scheduled);
      saveState(state);
      showToast(el, '📅 Scheduled for ' + time + '!');
    });

    /* --- Auto-post toggle --- */
    var autoToggle = el.querySelector('#ttk-auto-toggle');
    autoToggle.checked = state.autoPost;
    updateAutoStatus(el, state.autoPost);

    autoToggle.addEventListener('change', function () {
      state.autoPost = autoToggle.checked;
      saveState(state);
      updateAutoStatus(el, state.autoPost);
      if (state.autoPost) {
        autoInterval = startAutoPost(el, state);
        showToast(el, '🤖 Auto-Post enabled! AI will post automatically.');
      } else {
        if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
        showToast(el, '⏸️ Auto-Post paused.');
      }
    });

    /* --- Schedule tab: day picker --- */
    el.querySelector('#ttk-day-picker').querySelectorAll('.ttk-day-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { btn.classList.toggle('selected'); });
    });

    /* --- Add schedule --- */
    el.querySelector('#ttk-add-sched-btn').addEventListener('click', function () {
      var niche = el.querySelector('#ttk-sched-niche').value;
      var time  = el.querySelector('#ttk-sched-time').value;
      var days  = [];
      el.querySelectorAll('.ttk-day-btn.selected').forEach(function (b) { days.push(b.dataset.day); });
      if (!days.length) { showToast(el, '⚠️ Please select at least one day.'); return; }
      var sched = {
        id:      Date.now() + '_sched',
        niche:   niche,
        time:    time,
        days:    days,
        active:  true,
      };
      state.scheduledPosts.unshift(sched);
      saveState(state);
      renderSchedule(el, state);
      showToast(el, '📅 Schedule added!');
    });

    /* --- Settings save --- */
    el.querySelector('#ttk-save-settings-btn').addEventListener('click', function () {
      var name = el.querySelector('#ttk-account-input').value.trim();
      if (name) { state.accountName = name; }
      state.niche = el.querySelector('#ttk-default-niche').value;
      saveState(state);
      el.querySelector('#ttk-account-label').textContent = state.accountName;
      nicheSel.value = state.niche;
      showToast(el, '💾 Settings saved!');
    });

    /* --- Clear data --- */
    el.querySelector('#ttk-clear-btn').addEventListener('click', function () {
      if (!confirm('Clear all TikTok Studio data?')) return;
      state.posts = [];
      state.scheduledPosts = [];
      saveState(state);
      renderFeed(el, state);
      renderSchedule(el, state);
      showToast(el, '🗑️ All data cleared.');
    });

    /* --- Auto-post on startup if enabled --- */
    if (state.autoPost) {
      autoInterval = startAutoPost(el, state);
    }
  }

  function updateAutoStatus(el, on) {
    var s = el.querySelector('#ttk-auto-status');
    if (!s) return;
    s.textContent = on ? 'ON' : 'OFF';
    s.style.color = on ? '#00e676' : '#ff5252';
  }

  function startAutoPost(el, state) {
    var freqSel = el.querySelector('#ttk-freq-sel');
    var postsPerDay = freqSel ? parseInt(freqSel.value, 10) : 3;
    var ms = Math.round((24 * 60 * 60 * 1000) / postsPerDay);
    /* Clamp to [10s, 24h] range for demo usability — production would use full interval */
    var demoMs = Math.min(30000, ms);
    var interval = setInterval(function () {
      var niche   = state.niche;
      var content = generateContent(niche);
      var post    = {
        id:       content.id,
        content:  content,
        postedAt: new Date().toISOString(),
        status:   'posted',
        stats:    simulateStats(),
      };
      state.posts.unshift(post);
      if (state.posts.length > 100) state.posts = state.posts.slice(0, 100);
      saveState(state);
      showToast(el, '🤖 Auto-posted: ' + content.hook.substring(0, 40) + '…');
    }, demoMs);
    return interval;
  }

  /* ── Render helpers ─────────────────────────────────────────────── */
  function renderPreview(el, c) {
    var preview = el.querySelector('#ttk-preview');
    preview.innerHTML = [
      '<div class="ttk-phone-mock">',
      '  <div class="ttk-phone-screen">',
      '    <div class="ttk-vid-placeholder">',
      '      <span class="ttk-vid-icon">🎬</span>',
      '      <span class="ttk-vid-dur">' + escHtml(c.duration) + '</span>',
      '    </div>',
      '    <div class="ttk-overlay">',
      '      <div class="ttk-overlay-right">',
      '        <div class="ttk-action-btn">❤️<span>Like</span></div>',
      '        <div class="ttk-action-btn">💬<span>Comment</span></div>',
      '        <div class="ttk-action-btn">↗️<span>Share</span></div>',
      '        <div class="ttk-action-btn">🔖<span>Save</span></div>',
      '      </div>',
      '      <div class="ttk-overlay-bottom">',
      '        <div class="ttk-hook">' + escHtml(c.hook) + '</div>',
      '        <div class="ttk-script">',
      c.points.map(function (p, i) { return '          <span class="ttk-point">▶ ' + escHtml(p) + '</span>'; }).join('\n'),
      '        </div>',
      '        <div class="ttk-cta">' + escHtml(c.cta) + '</div>',
      '        <div class="ttk-hashtags">' + escHtml(c.hashtags) + '</div>',
      '        <div class="ttk-niche-badge">' + escHtml(c.niche) + '</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  function renderFeed(el, state) {
    var feed = el.querySelector('#ttk-feed');
    if (!feed) return;
    if (!state.posts.length) {
      feed.innerHTML = '<div class="ttk-empty">No posts yet. Generate content and post!</div>';
      return;
    }
    feed.innerHTML = state.posts.map(function (p, idx) {
      var d    = new Date(p.postedAt);
      var when = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      var s    = p.stats;
      return [
        '<div class="ttk-feed-item">',
        '  <div class="ttk-feed-top">',
        '    <span class="ttk-feed-hook">' + escHtml(p.content.hook) + '</span>',
        '    <button class="ttk-feed-del" data-idx="' + idx + '" title="Delete">✕</button>',
        '  </div>',
        '  <div class="ttk-feed-meta">',
        '    <span class="ttk-niche-badge">' + escHtml(p.content.niche) + '</span>',
        '    <span class="ttk-dur-badge">' + escHtml(p.content.duration) + '</span>',
        '    <span class="ttk-time">' + escHtml(when) + '</span>',
        '  </div>',
        '  <div class="ttk-feed-stats">',
        '    <span>👀 ' + escHtml(fmtNum(s.views))    + '</span>',
        '    <span>❤️ '  + escHtml(fmtNum(s.likes))   + '</span>',
        '    <span>🔁 ' + escHtml(fmtNum(s.shares))   + '</span>',
        '    <span>💬 ' + escHtml(fmtNum(s.comments)) + '</span>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    /* Delete buttons */
    feed.querySelectorAll('.ttk-feed-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.idx, 10);
        state.posts.splice(idx, 1);
        saveState(state);
        renderFeed(el, state);
        renderAnalytics(el, state);
      });
    });
  }

  function renderSchedule(el, state) {
    var list = el.querySelector('#ttk-sched-list');
    if (!list) return;
    if (!state.scheduledPosts.length) {
      list.innerHTML = '<div class="ttk-empty">No schedules yet. Add one above!</div>';
      return;
    }
    list.innerHTML = state.scheduledPosts.map(function (s, idx) {
      var niche = s.niche || (s.content && s.content.niche) || 'Unknown';
      var days  = s.days ? s.days.join(', ') : 'One-time';
      var time  = s.time || '—';
      return [
        '<div class="ttk-sched-item">',
        '  <div class="ttk-sched-info">',
        '    <span class="ttk-niche-badge">' + escHtml(niche) + '</span>',
        '    <span class="ttk-sched-time">⏰ ' + escHtml(time) + '</span>',
        '    <span class="ttk-sched-days">📅 ' + escHtml(days) + '</span>',
        '  </div>',
        '  <button class="ttk-feed-del" data-idx="' + idx + '" title="Remove">✕</button>',
        '</div>',
      ].join('');
    }).join('');

    list.querySelectorAll('.ttk-feed-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.idx, 10);
        state.scheduledPosts.splice(idx, 1);
        saveState(state);
        renderSchedule(el, state);
      });
    });
  }

  function renderAnalytics(el, state) {
    var container = el.querySelector('#ttk-analytics');
    if (!container) return;
    var posts = state.posts;
    if (!posts.length) {
      container.innerHTML = '<div class="ttk-empty">No data yet. Start posting to see analytics!</div>';
      return;
    }

    var totalViews    = posts.reduce(function (a, p) { return a + p.stats.views; }, 0);
    var totalLikes    = posts.reduce(function (a, p) { return a + p.stats.likes; }, 0);
    var totalShares   = posts.reduce(function (a, p) { return a + p.stats.shares; }, 0);
    var totalComments = posts.reduce(function (a, p) { return a + p.stats.comments; }, 0);
    var engRate       = totalViews > 0 ? (((totalLikes + totalShares + totalComments) / totalViews) * 100).toFixed(1) : '0.0';

    /* Niche breakdown */
    var nicheCounts = {};
    posts.forEach(function (p) {
      var n = p.content.niche;
      nicheCounts[n] = (nicheCounts[n] || 0) + 1;
    });
    var topNiches = Object.keys(nicheCounts).sort(function (a, b) { return nicheCounts[b] - nicheCounts[a]; }).slice(0, 4);

    /* Best post */
    var best = posts.reduce(function (a, b) { return b.stats.views > a.stats.views ? b : a; }, posts[0]);

    container.innerHTML = [
      '<div class="ttk-stats-grid">',
      '  <div class="ttk-stat-card"><span class="ttk-stat-val">' + escHtml(fmtNum(totalViews))    + '</span><span class="ttk-stat-lbl">Total Views</span></div>',
      '  <div class="ttk-stat-card"><span class="ttk-stat-val">' + escHtml(fmtNum(totalLikes))   + '</span><span class="ttk-stat-lbl">Total Likes</span></div>',
      '  <div class="ttk-stat-card"><span class="ttk-stat-val">' + escHtml(fmtNum(totalShares))  + '</span><span class="ttk-stat-lbl">Total Shares</span></div>',
      '  <div class="ttk-stat-card"><span class="ttk-stat-val">' + escHtml(engRate) + '%</span><span class="ttk-stat-lbl">Engagement Rate</span></div>',
      '  <div class="ttk-stat-card"><span class="ttk-stat-val">' + escHtml(String(posts.length)) + '</span><span class="ttk-stat-lbl">Total Posts</span></div>',
      '  <div class="ttk-stat-card"><span class="ttk-stat-val">' + escHtml(fmtNum(posts.length > 0 ? Math.round(totalViews / posts.length) : 0)) + '</span><span class="ttk-stat-lbl">Avg Views/Post</span></div>',
      '</div>',
      '<div class="ttk-section-title">🏆 Top Niches</div>',
      '<div class="ttk-niche-bars">',
      topNiches.map(function (n) {
        var pct = Math.round((nicheCounts[n] / posts.length) * 100);
        return [
          '<div class="ttk-niche-bar-row">',
          '  <span class="ttk-nb-label">' + escHtml(n) + '</span>',
          '  <div class="ttk-nb-track"><div class="ttk-nb-fill" style="width:' + escHtml(String(pct)) + '%"></div></div>',
          '  <span class="ttk-nb-pct">' + escHtml(String(pct)) + '%</span>',
          '</div>',
        ].join('');
      }).join(''),
      '</div>',
      '<div class="ttk-section-title">🔥 Best Performing Post</div>',
      '<div class="ttk-best-post">',
      '  <div class="ttk-feed-hook">' + escHtml(best.content.hook) + '</div>',
      '  <div class="ttk-feed-stats">',
      '    <span>👀 ' + escHtml(fmtNum(best.stats.views))    + '</span>',
      '    <span>❤️ '  + escHtml(fmtNum(best.stats.likes))   + '</span>',
      '    <span>🔁 ' + escHtml(fmtNum(best.stats.shares))   + '</span>',
      '    <span>💬 ' + escHtml(fmtNum(best.stats.comments)) + '</span>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function renderSettings(el, state) {
    var inp = el.querySelector('#ttk-account-input');
    if (inp) inp.value = state.accountName || '';
    var defNiche = el.querySelector('#ttk-default-niche');
    if (defNiche) defNiche.value = state.niche || NICHES[0];
  }

  function showToast(el, msg) {
    var t = document.createElement('div');
    t.className = 'ttk-toast';
    t.textContent = msg;
    el.appendChild(t);
    setTimeout(function () { t.classList.add('visible'); }, 10);
    setTimeout(function () {
      t.classList.remove('visible');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 3000);
  }

  /* ── Open ───────────────────────────────────────────────────────── */
  function open() {
    var state = loadState();
    var el = WindowManager.create({
      id:      'tiktokstudio',
      title:   'TikTok AI Studio',
      icon:    '🎵',
      width:   620,
      height:  680,
      content: buildUI(),
    });
    el.querySelector('#ttk-account-label').textContent = state.accountName;
    init(el, state);
    renderFeed(el, state);
  }

  NightOS.registerApp('tiktokstudio', {
    title: 'TikTok AI Studio',
    icon:  '🎵',
    open:  open,
  });
})();
