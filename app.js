/* Bharat Survey App JS (client-side demo)
   - LocalStorage used for persistence
   - Core pure functions exposed on window.BS for testing */

(function() {
    const STORAGE_KEYS = {
        user: 'bs_user',
        forms: 'bs_forms',
        session: 'bs_session'
    };

    function uid() {
        return 'f_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // ---------- Core pure logic (testable) ----------
    function addForm(forms, form) {
        const newForm = {
            id: uid(),
            name: form.name.trim(),
            description: form.description || '',
            fields: Array.isArray(form.fields) ? form.fields.map((f) => ({ id: uid(), ...f })) : [],
            createdAt: nowIso(),
            archived: false,
            sharedWith: []
        };
        return [newForm, ...forms];
    }

    function deleteFormsByIds(forms, ids) {
        const set = new Set(ids);
        return forms.filter((f) => !set.has(f.id));
    }

    function setArchiveForIds(forms, ids, archived) {
        const set = new Set(ids);
        return forms.map((f) => set.has(f.id) ? { ...f, archived } : f);
    }

    function shareFormsWith(forms, ids, share) {
        const set = new Set(ids);
        return forms.map((f) => {
            if (!set.has(f.id)) return f;
            const existing = (f.sharedWith || []).filter((s) => s.email.toLowerCase() !== share.email.toLowerCase());
            return { ...f, sharedWith: [...existing, { email: share.email, permission: share.permission }] };
        });
    }

    function filterForms(forms, filter, currentUserEmail) {
        if (filter === 'mine') return forms.filter((f) => !f.sharedWith || f.sharedWith.length === 0);
        if (filter === 'shared') return forms.filter((f) => (f.sharedWith || []).some((s) => s.email.toLowerCase() === currentUserEmail.toLowerCase()));
        return forms;
    }

    function validateProfile(profile) {
        const errors = {};
        if (!profile.name || profile.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(profile.email || '')) errors.email = 'Invalid email address';
        const phoneDigits = (profile.phone || '').replace(/\D/g, '');
        if (phoneDigits.length < 10) errors.phone = 'Phone must be at least 10 digits';
        return errors;
    }

    function toCSV(form) {
        const header = ['label', 'type', 'options'];
        const rows = form.fields.map((f) => [f.label, f.type, (f.options || []).join('|')]);
        return [header, ...rows].map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    }

    function toHTML(form) {
        const fieldsHtml = form.fields.map((f) => `<tr><td>${escapeHtml(f.label)}</td><td>${escapeHtml(f.type)}</td><td>${escapeHtml((f.options || []).join(' | '))}</td></tr>`).join('');
        return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(form.name)}</title></head><body><h1>${escapeHtml(form.name)}</h1><p>${escapeHtml(form.description || '')}</p><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Label</th><th>Type</th><th>Options</th></tr></thead><tbody>${fieldsHtml}</tbody></table></body></html>`;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Expose pure functions for tests
    window.BS = {
        addForm,
        deleteFormsByIds,
        setArchiveForIds,
        shareFormsWith,
        filterForms,
        validateProfile,
        toCSV,
        toHTML
    };

    // ---------- UI State ----------
    function getForms() {
        return readStorage(STORAGE_KEYS.forms, []);
    }

    function saveForms(forms) {
        writeStorage(STORAGE_KEYS.forms, forms);
    }

    function getUser() {
        return readStorage(STORAGE_KEYS.user, null);
    }

    function saveUser(user) {
        writeStorage(STORAGE_KEYS.user, user);
    }

    function isLoggedIn() {
        return !!readStorage(STORAGE_KEYS.session, null);
    }

    function setSession(session) {
        writeStorage(STORAGE_KEYS.session, session);
    }

    // ---------- Navigation ----------
    window.showPage = function(pageId) {
        document.querySelectorAll('div[id$="-page"]').forEach((page) => {
            page.style.display = 'none';
        });
        const el = document.getElementById(pageId);
        if (el) el.style.display = 'block';
        window.scrollTo(0, 0);
        updateNavMenus();
        if (pageId === 'dashboard-page') {
            initDashboard();
        }
    };

    function updateNavMenus() {
        const auth = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const user = getUser();
        if (isLoggedIn() && user) {
            auth.style.display = 'none';
            userMenu.style.display = 'flex';
            const greet = document.getElementById('user-greeting');
            greet.textContent = `Hi, ${user.name.split(' ')[0]}`;
        } else {
            auth.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    window.logout = function() {
        writeStorage(STORAGE_KEYS.session, null);
        updateNavMenus();
        showPage('home-page');
    };

    // Header glass effect on scroll
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (!header) return;
        if (window.scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.8)';
            header.style.backdropFilter = 'blur(10px)';
            header.style.webkitBackdropFilter = 'blur(10px)';
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.7)';
            header.style.backdropFilter = 'blur(10px)';
            header.style.webkitBackdropFilter = 'blur(10px)';
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    });

    // Counters on home
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const speed = 200;
        counters.forEach((counter) => {
            const target = parseInt(counter.innerText.replace(/,/g, '')) || 0;
            let count = 0;
            function updateCount() {
                const increment = target / speed;
                if (count < target) {
                    count += increment;
                    counter.innerText = Math.ceil(count).toLocaleString();
                    setTimeout(updateCount, 1);
                } else {
                    counter.innerText = target.toLocaleString();
                }
            }
            updateCount();
        });
    }

    // ---------- Auth Handlers ----------
    function wireAuth() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value.trim();
                if (!email || !password) return alert('Please enter email and password');
                // Demo: if user doesn't exist yet, create a minimal user
                let user = getUser();
                if (!user) {
                    user = { name: email.split('@')[0], email, phone: '', organization: '' };
                    saveUser(user);
                }
                setSession({ email, loginAt: nowIso() });
                updateNavMenus();
                showPage('dashboard-page');
            });
        }

        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('signup-name').value.trim();
                const email = document.getElementById('signup-email').value.trim();
                const phone = document.getElementById('signup-phone').value.trim();
                const organization = document.getElementById('signup-organization').value.trim();
                const password = document.getElementById('signup-password').value;
                const confirmPassword = document.getElementById('signup-confirm-password').value;
                if (password !== confirmPassword) return alert('Passwords do not match!');
                const errors = validateProfile({ name, email, phone });
                if (Object.keys(errors).length) return alert('Please fix profile errors before continuing.');
                saveUser({ name, email, phone, organization });
                setSession({ email, loginAt: nowIso() });
                updateNavMenus();
                showPage('dashboard-page');
            });
        }
    }

    // ---------- Dashboard ----------
    function initDashboard() {
        wireTabs();
        renderFormsTables();
        wireFormsToolbar();
        wireBuilder();
        renderProfileSection();
    }

    function wireTabs() {
        const tabs = [
            { btn: 'tab-forms', sec: 'section-forms' },
            { btn: 'tab-create', sec: 'section-create' },
            { btn: 'tab-archived', sec: 'section-archived' },
            { btn: 'tab-profile', sec: 'section-profile' }
        ];
        tabs.forEach(({ btn, sec }) => {
            const b = document.getElementById(btn);
            const s = document.getElementById(sec);
            if (b && s) {
                b.addEventListener('click', () => {
                    document.querySelectorAll('.content-section').forEach((el) => el.classList.remove('active'));
                    s.classList.add('active');
                });
            }
        });
    }

    function renderFormsTables() {
        const forms = getForms();
        renderFormsTable(forms.filter((f) => !f.archived), 'forms-table-body', false);
        renderFormsTable(forms.filter((f) => f.archived), 'archived-table-body', true);
    }

    function renderFormsTable(forms, tbodyId, archived) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (forms.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="muted">No ${archived ? 'archived ' : ''}forms yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = forms.map((f) => {
            const shared = (f.sharedWith || []).map((s) => `${escapeHtml(s.email)} (${escapeHtml(s.permission)})`).join(', ');
            return `<tr>
                <td><input type="checkbox" class="row-check" data-id="${f.id}"></td>
                <td>${escapeHtml(f.name)}</td>
                <td><span class="badge">${f.fields.length}</span></td>
                <td>${new Date(f.createdAt).toLocaleString()}</td>
                <td>${f.archived ? '<span class="badge">Archived</span>' : '<span class="badge">Active</span>'}</td>
                <td>${shared || '<span class="muted">-</span>'}</td>
                <td>
                    <button class="btn btn-outline" data-action="download" data-id="${f.id}"><i class="fa-solid fa-download"></i></button>
                    ${archived ? '' : `<button class="btn btn-outline" data-action="archive" data-id="${f.id}"><i class="fa-solid fa-box-archive"></i></button>`}
                    ${archived ? `<button class="btn btn-outline" data-action="unarchive" data-id="${f.id}"><i class="fa-solid fa-box-open"></i></button>` : ''}
                    <button class="btn btn-outline" data-action="share" data-id="${f.id}"><i class="fa-solid fa-share-nodes"></i></button>
                    <button class="btn btn-danger" data-action="delete" data-id="${f.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');

        // Row action handlers
        tbody.querySelectorAll('button[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => handleRowAction(btn.dataset.action, btn.dataset.id));
        });
    }

    function handleRowAction(action, id) {
        let forms = getForms();
        if (action === 'delete') {
            forms = deleteFormsByIds(forms, [id]);
            saveForms(forms);
        } else if (action === 'archive') {
            forms = setArchiveForIds(forms, [id], true);
            saveForms(forms);
        } else if (action === 'unarchive') {
            forms = setArchiveForIds(forms, [id], false);
            saveForms(forms);
        } else if (action === 'share') {
            const email = prompt('Enter email to share with');
            if (!email) return;
            const permission = prompt('Permission (viewer or editor)', 'viewer') || 'viewer';
            forms = shareFormsWith(forms, [id], { email, permission });
            saveForms(forms);
        } else if (action === 'download') {
            const formatSelect = document.getElementById('download-format');
            const format = formatSelect ? formatSelect.value : 'json';
            const form = forms.find((f) => f.id === id);
            if (form) downloadForm(form, format);
        }
        renderFormsTables();
    }

    function selectedIds(scope) {
        const selector = scope === 'archived' ? '#archived-table-body .row-check' : '#forms-table-body .row-check';
        return Array.from(document.querySelectorAll(selector)).filter((c) => c.checked).map((c) => c.dataset.id);
    }

    function wireFormsToolbar() {
        const checkAll = document.getElementById('check-all');
        if (checkAll) checkAll.addEventListener('change', () => toggleAll('#forms-table-body .row-check', checkAll.checked));
        const checkAllArchived = document.getElementById('check-all-archived');
        if (checkAllArchived) checkAllArchived.addEventListener('change', () => toggleAll('#archived-table-body .row-check', checkAllArchived.checked));
        const btnSelectAll = document.getElementById('btn-select-all');
        if (btnSelectAll) btnSelectAll.addEventListener('click', () => toggleAll('#forms-table-body .row-check', true));

        onClick('btn-download-selected', () => {
            const ids = selectedIds('active');
            if (ids.length === 0) return alert('Select at least one form');
            const forms = getForms().filter((f) => ids.includes(f.id));
            const format = document.getElementById('download-format').value;
            if (format === 'json' && forms.length > 1) {
                // download a bundle
                const blob = new Blob([JSON.stringify(forms, null, 2)], { type: 'application/json' });
                saveBlob(blob, `forms_${Date.now()}.json`);
            } else {
                forms.forEach((form) => downloadForm(form, format));
            }
        });

        onClick('btn-delete-selected', () => {
            const ids = selectedIds('active');
            if (ids.length === 0) return alert('Select at least one form');
            const forms = deleteFormsByIds(getForms(), ids);
            saveForms(forms);
            renderFormsTables();
        });

        onClick('btn-archive-selected', () => {
            const ids = selectedIds('active');
            if (ids.length === 0) return alert('Select at least one form');
            const forms = setArchiveForIds(getForms(), ids, true);
            saveForms(forms);
            renderFormsTables();
        });

        onClick('btn-share-selected', () => {
            const ids = selectedIds('active');
            if (ids.length === 0) return alert('Select at least one form');
            const email = prompt('Enter email to share with');
            if (!email) return;
            const permission = prompt('Permission (viewer or editor)', 'viewer') || 'viewer';
            const forms = shareFormsWith(getForms(), ids, { email, permission });
            saveForms(forms);
            renderFormsTables();
        });

        onClick('btn-unarchive-selected', () => {
            const ids = selectedIds('archived');
            if (ids.length === 0) return alert('Select at least one form');
            const forms = setArchiveForIds(getForms(), ids, false);
            saveForms(forms);
            renderFormsTables();
        });

        onClick('btn-delete-archived-selected', () => {
            const ids = selectedIds('archived');
            if (ids.length === 0) return alert('Select at least one form');
            const forms = deleteFormsByIds(getForms(), ids);
            saveForms(forms);
            renderFormsTables();
        });

        // Filters (basic demo)
        document.querySelectorAll('#section-forms .pill').forEach((pill) => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('#section-forms .pill').forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const user = getUser() || { email: '' };
                const allActive = getForms().filter((f) => !f.archived);
                const filtered = filterForms(allActive, pill.dataset.filter, user.email);
                renderFormsTable(filtered, 'forms-table-body', false);
            });
        });
    }

    function onClick(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    function toggleAll(selector, checked) {
        document.querySelectorAll(selector).forEach((c) => { c.checked = checked; });
    }

    function downloadForm(form, format) {
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' });
            saveBlob(blob, `${sanitizeFilename(form.name)}.json`);
        } else if (format === 'csv') {
            const csv = toCSV(form);
            const blob = new Blob([csv], { type: 'text/csv' });
            saveBlob(blob, `${sanitizeFilename(form.name)}.csv`);
        } else if (format === 'html') {
            const html = toHTML(form);
            const blob = new Blob([html], { type: 'text/html' });
            saveBlob(blob, `${sanitizeFilename(form.name)}.html`);
        }
    }

    function sanitizeFilename(name) {
        return name.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60);
    }

    function saveBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ---------- Form Builder ----------
    function wireBuilder() {
        const fieldsContainer = document.getElementById('fields-container');
        const preview = document.getElementById('form-preview');
        const btnAdd = document.getElementById('btn-add-field');
        const btnSave = document.getElementById('btn-save-form');
        const btnReset = document.getElementById('btn-reset-builder');

        if (!fieldsContainer || !btnAdd || !btnSave || !btnReset) return;

        btnAdd.onclick = () => {
            const row = document.createElement('div');
            row.className = 'field-row';
            row.innerHTML = `
                <input class="form-control" placeholder="Label (e.g., Household ID)">
                <select class="form-control">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Select</option>
                </select>
                <input class="form-control" placeholder="Options (comma-separated for select)">
                <button class="btn btn-danger" title="Remove"><i class="fa-solid fa-xmark"></i></button>
            `;
            const removeBtn = row.querySelector('button');
            removeBtn.addEventListener('click', (e) => { e.preventDefault(); row.remove(); updatePreview(); });
            fieldsContainer.appendChild(row);
            row.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', updatePreview));
            updatePreview();
        };

        btnReset.onclick = () => {
            document.getElementById('form-name').value = '';
            document.getElementById('form-description').value = '';
            fieldsContainer.innerHTML = '';
            updatePreview();
        };

        btnSave.onclick = () => {
            const name = document.getElementById('form-name').value.trim();
            const description = document.getElementById('form-description').value.trim();
            const nameErr = document.getElementById('form-name-error');
            if (!name) {
                nameErr.style.display = 'block';
                nameErr.textContent = 'Form name is required';
                return;
            }
            nameErr.style.display = 'none';
            const fieldRows = Array.from(fieldsContainer.querySelectorAll('.field-row'));
            const fields = fieldRows.map((row) => {
                const [labelEl, typeEl, optsEl] = row.querySelectorAll('input,select');
                const options = typeEl.value === 'select' ? (optsEl.value.split(',').map((s) => s.trim()).filter(Boolean)) : [];
                return { label: labelEl.value.trim(), type: typeEl.value, options };
            }).filter((f) => f.label);

            let forms = getForms();
            forms = addForm(forms, { name, description, fields });
            saveForms(forms);
            renderFormsTables();
            alert('Form saved');
        };

        function updatePreview() {
            const name = document.getElementById('form-name').value.trim();
            const description = document.getElementById('form-description').value.trim();
            const fieldRows = Array.from(fieldsContainer.querySelectorAll('.field-row'));
            if (fieldRows.length === 0 && !name && !description) {
                preview.innerHTML = 'Start adding fields to see a preview.';
                return;
            }
            const fields = fieldRows.map((row) => {
                const [labelEl, typeEl, optsEl] = row.querySelectorAll('input,select');
                return { label: labelEl.value.trim(), type: typeEl.value, options: optsEl.value };
            });
            preview.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>${escapeHtml(name || 'Untitled Form')}</strong>
                    <div class="muted">${escapeHtml(description || '')}</div>
                </div>
                <table style="width:100%"><thead><tr><th align="left">Label</th><th align="left">Type</th><th align="left">Options</th></tr></thead>
                <tbody>
                    ${fields.map((f) => `<tr><td>${escapeHtml(f.label)}</td><td>${escapeHtml(f.type)}</td><td>${escapeHtml(f.options)}</td></tr>`).join('')}
                </tbody></table>
            `;
        }
    }

    // ---------- Profile ----------
    function renderProfileSection() {
        const user = getUser() || { name: '', email: '', phone: '', organization: '' };
        const nameEl = document.getElementById('profile-name');
        const emailEl = document.getElementById('profile-email');
        const phoneEl = document.getElementById('profile-phone');
        const orgEl = document.getElementById('profile-org');
        if (!nameEl || !emailEl || !phoneEl || !orgEl) return;
        nameEl.value = user.name || '';
        emailEl.value = user.email || '';
        phoneEl.value = user.phone || '';
        orgEl.value = user.organization || '';
        const errors = {
            name: document.getElementById('profile-name-error'),
            email: document.getElementById('profile-email-error'),
            phone: document.getElementById('profile-phone-error')
        };
        const summary = document.getElementById('profile-summary');
        function updateSummary() {
            const u = getUser() || {};
            summary.innerHTML = `<strong>${escapeHtml(u.name || '')}</strong><br>${escapeHtml(u.email || '')}<br>${escapeHtml(u.phone || '')}<br>${escapeHtml(u.organization || '')}`;
        }
        updateSummary();

        function handleInput() {
            const profile = { name: nameEl.value.trim(), email: emailEl.value.trim(), phone: phoneEl.value.trim(), organization: orgEl.value.trim() };
            const v = validateProfile(profile);
            errors.name.style.display = v.name ? 'block' : 'none';
            errors.email.style.display = v.email ? 'block' : 'none';
            errors.phone.style.display = v.phone ? 'block' : 'none';
            errors.name.textContent = v.name || '';
            errors.email.textContent = v.email || '';
            errors.phone.textContent = v.phone || '';
            if (Object.keys(v).length === 0) {
                saveUser(profile);
                updateSummary();
                updateNavMenus();
            }
        }

        [nameEl, emailEl, phoneEl, orgEl].forEach((el) => el.addEventListener('input', handleInput));
    }

    // ---------- Boot ----------
    window.addEventListener('load', function() {
        // Default to home
        showPage('home-page');
        animateCounters();
        wireAuth();
        updateNavMenus();
        if (isLoggedIn()) showPage('dashboard-page');
    });
})();

