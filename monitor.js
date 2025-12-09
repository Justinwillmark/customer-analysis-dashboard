document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const monitorInfo = document.getElementById('monitor-info');
    const churnPeriodInfo = document.getElementById('churn-period-info');
    const reactivatedCount = document.getElementById('reactivated-count');
    const reactivatedProgress = document.getElementById('reactivated-progress');
    const timeRemainingEl = document.getElementById('time-remaining');
    const monitorTable = document.getElementById('monitor-table');
    const monitorMobileList = document.getElementById('monitor-mobile-list'); 
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshBtnText = document.getElementById('refresh-btn-text');
    const refreshIcon = document.getElementById('refresh-icon');
    const loadingSpinner = document.getElementById('loading-spinner');
    const searchInput = document.getElementById('search-monitor-input');
    const noResults = document.getElementById('no-results');
    
    // New DOM Elements for View Modes
    const reactivatedCard = document.getElementById('reactivated-card');
    const timeRemainingCard = document.getElementById('time-remaining-card');
    const viewAsAdminBtn = document.getElementById('view-as-admin-btn');
    const copyAgentLinkBtn = document.getElementById('copy-agent-link-btn');
    const adminLoginOverlay = document.getElementById('admin-login-overlay');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const adminLoginError = document.getElementById('admin-login-error');
    const cancelLoginBtn = document.getElementById('cancel-login-btn');

    // State
    let monitorData = null;
    let assignedUsers = [];
    
    // Check URL parameters for view mode
    const urlParams = new URLSearchParams(window.location.search);
    let isAgentView = urlParams.get('mode') === 'agent';

    // Helper Functions
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    const formatPeriodText = (range) => {
        if (!range || !range.start || range.start === 'File') return 'a previous period';

        const startDate = new Date(range.start + 'T00:00:00');
        const endDate = new Date(range.end + 'T00:00:00');
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        if (startYear !== endYear) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } else {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }
    };

    const toYYYYMMDD = (d) => d.toISOString().split('T')[0];

    const fetchAndParse = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: reject
            });
        });
    };

    const setTableLoadingState = (isLoading, errorMsg = null) => {
        const html = isLoading 
            ? `<tr><td colspan="9" class="px-6 py-12 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <svg class="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="font-medium text-lg">Retrieving monitor data...</p>
                    <p class="text-sm mt-2 opacity-75">Fetching user details from source</p>
                </div></td></tr>`
            : (errorMsg ? `<tr><td colspan="9" class="px-6 py-4 text-center text-red-600">${errorMsg}</td></tr>` : '');

        monitorTable.innerHTML = html;
        
        // Also update Mobile loading
        if (isLoading) {
            monitorMobileList.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg class="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading data...</p>
            </div>`;
        } else if (errorMsg) {
            monitorMobileList.innerHTML = `<div class="text-center text-red-600 py-4">${errorMsg}</div>`;
        }
    };

    const hydrateMonitorData = async () => {
        setTableLoadingState(true);

        try {
            const { api, d1, d2, a, aes, due, cr } = monitorData;

            // Normalize URL
            const retentionEndpoint = api.replace('/churn', '/retention');
            
            // Construct URLs for data reconstruction
            const url1 = `${retentionEndpoint}?download=retained-user-stats&startDate=${d1.s}&endDate=${d1.e}`;
            // We fetch P2 just to ensure churn logic holds if needed
            const url2 = `${retentionEndpoint}?download=retained-user-stats&startDate=${d2.s}&endDate=${d2.e}`; 
            const churnUrl = `${retentionEndpoint}?download=churned-users&startDate=${d1.s}&endDate=${d1.e}`;

            // Fetch Data
            const [p1Data, p2Data, churnDetailsData] = await Promise.all([
                fetchAndParse(url1),
                fetchAndParse(url2),
                fetchAndParse(churnUrl)
            ]);

            const churnDetailsMap = new Map(churnDetailsData.map(u => [u['Phone Number'], u]));
            
            // 'a' is the assignment map: [[phoneNumber, aeIndex], ...]
            // Create a map for fast lookup of assigned users
            const assignedMap = new Map(a.map(([phone, aeIdx]) => [phone, aes[aeIdx]]));

            monitorData.assignedUsers = [];

            // Reconstruct the user objects
            assignedMap.forEach((aeName, phone) => {
                // Try to find the user in Period 1 data or Churn Details
                const p1User = p1Data.find(u => u['Phone Number'] === phone);
                const details = churnDetailsMap.get(phone);

                if (p1User || details) {
                    const user = {
                        ...p1User, // Base data
                        ...details, // Enriched data
                        // Explicitly prioritize enriched details if available
                        'First Name': details?.['First Name'] || p1User?.['First Name'] || 'Unknown',
                        'Last Name': details?.['Last Name'] || p1User?.['Last Name'] || '',
                        'Phone Number': phone,
                        'Created Date': details?.['Created Date'] || p1User?.['Created Date'],
                        'Store Name': details?.['Store Name'] || p1User?.['Store Name'] || 'N/A',
                        'Store Address': details?.['Store Address'] || p1User?.['Store Address'] || 'N/A',
                        'LGA': details?.['LGA'] || p1User?.['LGA'] || 'N/A',
                        assignedAE: aeName
                    };
                    monitorData.assignedUsers.push(user);
                }
            });

            assignedUsers = monitorData.assignedUsers;
            
            // Backfill legacy properties so the rest of the app works seamlessly
            monitorData.dateRange2 = { start: d2.s, end: d2.e };
            monitorData.apiBaseUrl = api;
            monitorData.reactivationStartDate = d2.e;
            monitorData.dueDate = due; // Fix for "NaN days"
            monitorData.creationDate = cr; // Fix for missing creation date
            
            return true;
        } catch (error) {
            console.error('Hydration Error:', error);
            setTableLoadingState(false, `Error loading monitor data: ${error.message}`);
            return false;
        }
    };

    const decodeMonitorData = () => {
        try {
            const hash = window.location.hash.slice(1);
            if (!hash) throw new Error('No monitor data found in URL.');
            
            // OPTIMIZED FIX: Convert to Uint8Array directly
            // This prevents "undefined" return from pako on mobile browsers
            const binaryString = atob(hash);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const jsonString = pako.inflate(bytes, { to: 'string' });
            
            if (!jsonString) {
                throw new Error('Decompression returned empty data.');
            }

            monitorData = JSON.parse(jsonString);

            // Version 2: Compact Link (Requires Hydration)
            if (monitorData.v === 2) {
                return true; 
            }

            // Version 1: Legacy (Full Payload)
            if (monitorData.u) {
                monitorData.assignedUsers = monitorData.u.map(row => ({
                    'First Name': row[0],
                    'Last Name': row[1],
                    'Phone Number': row[2],
                    'Store Name': row[3],
                    'Store Address': row[4],
                    'LGA': row[5],
                    'Created Date': row[6],
                    'assignedAE': row[7]
                }));
                assignedUsers = monitorData.assignedUsers || [];
            }
            return true;
        } catch (error) {
            console.error('Error decoding monitor data:', error);
            setTableLoadingState(false, `Error loading monitor data: ${error.message}`);
            return false;
        }
    };

    const updateMonitorInfo = () => {
        const creationDate = formatDate(monitorData.creationDate || monitorData.cr);
        const dueDate = formatDate(monitorData.dueDate);
        monitorInfo.textContent = `Monitor created on: ${creationDate} | Due Date: ${dueDate}`;

        if (monitorData.dateRange2 || monitorData.d2) {
            const range = monitorData.dateRange2 || { start: monitorData.d2.s, end: monitorData.d2.e };
            const churnPeriodText = formatPeriodText(range);
            churnPeriodInfo.textContent = `Monitoring users who churned during the period of ${churnPeriodText}.`;
        }
    };

    const updateTimeRemaining = () => {
        const now = new Date();
        const due = new Date(monitorData.dueDate);
        const diffMs = due - now;

        timeRemainingEl.classList.remove('text-red-600', 'text-yellow-600');

        if (diffMs <= 0) {
            timeRemainingEl.textContent = 'Overdue';
            timeRemainingEl.classList.add('text-red-600');
            return;
        }
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        timeRemainingEl.textContent = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
        if (diffDays <= 7) {
            timeRemainingEl.classList.add('text-yellow-600');
        }
    };

    const updateReactivatedCount = (usersSubset) => {
        const reactivated = usersSubset.filter(u => u.status === 'Reactivated').length;
        const total = usersSubset.length;
        reactivatedCount.textContent = `${reactivated}/${total}`;
        
        const percentage = total > 0 ? (reactivated / total) * 100 : 0;
        reactivatedProgress.style.width = `${percentage}%`;
    };

    const renderTable = (usersToRender) => {
        monitorTable.innerHTML = '';
        monitorMobileList.innerHTML = ''; // Clear mobile list
        noResults.classList.add('hidden');

        // VISIBILITY LOGIC:
        if (isAgentView) {
            if (searchInput.value.trim() === '') {
                 // REQ 2 (Agent): Don't hide, just reset to 0/0
                 reactivatedCard.classList.remove('hidden'); 
                 reactivatedCount.textContent = '0/0';
                 reactivatedProgress.style.width = '0%';
                 
                 const emptyMsg = `
                    <tr><td colspan="9" class="px-6 py-12 text-center text-gray-500 italic text-lg">Type in the search bar above to get results.</td></tr>
                 `;
                 monitorTable.innerHTML = emptyMsg;
                 monitorMobileList.innerHTML = `<div class="text-center text-gray-500 py-12 italic text-lg">Type in the search bar above to get results.</div>`;
                 return;
            } else {
                 reactivatedCard.classList.remove('hidden'); // Show stats for search results
                 updateReactivatedCount(usersToRender); // Update stats based on SEARCH results
            }
        } else {
            // Admin View:
            reactivatedCard.classList.remove('hidden');
            // REQ 2 (Admin): Use filtered results (usersToRender) instead of full list (assignedUsers)
            // so the stats reflect what is currently on screen (Search/Filter results).
            updateReactivatedCount(usersToRender); 
        }

        // Standard empty state handling for search results
        if (usersToRender.length === 0) {
            if (searchInput.value) {
                noResults.classList.remove('hidden');
                monitorMobileList.innerHTML = ''; // No results on mobile too
            } else {
                const noUsersMsg = '<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No assigned users.</td></tr>';
                monitorTable.innerHTML = noUsersMsg;
                monitorMobileList.innerHTML = `<div class="text-center text-gray-500 py-8">No assigned users.</div>`;
            }
            return;
        }

        // Render Desktop and Mobile Views
        const fragment = document.createDocumentFragment();
        const mobileFragment = document.createDocumentFragment();

        usersToRender.forEach((user, index) => {
            // 1. Desktop Row
            const tr = document.createElement('tr');
            tr.className = 'transition-colors duration-500';

            const isReactivated = user.status === 'Reactivated';
            if (isReactivated) {
                tr.classList.add('reactivated-row');
            }
            
            const statusBadge = isReactivated
                ? `<span class="status-badge status-reactivated">Reactivated</span>`
                : `<span class="status-badge status-churned">Churned</span>`;

            tr.innerHTML = `
                <td class="px-6 py-4 text-sm text-gray-700">${index + 1}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-800">${user['First Name']} ${user['Last Name']}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['Phone Number']}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${formatDate(user['Created Date'])}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['Store Name'] || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['LGA'] || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['Store Address'] || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-700 font-semibold">${user.assignedAE}</td>
                <td class="px-6 py-4 text-sm font-medium text-center">${statusBadge}</td>
            `;
            fragment.appendChild(tr);

            // 2. Mobile Card (REQ 3 - Smaller/Compact Cards)
            const card = document.createElement('div');
            // reduced padding p-3, reduced gap-2
            card.className = `bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-2 ${isReactivated ? 'border-green-200 bg-green-50' : ''}`;
            
            // Format phone number for dialing logic (234 -> 0)
            let dialNumber = user['Phone Number'] || '';
            if (dialNumber.toString().startsWith('234')) {
                dialNumber = '0' + dialNumber.toString().substring(3);
            }

            // Mobile formatting - Smaller button/text for phone
            const phoneLink = user['Phone Number'] 
                ? `<a href="tel:${dialNumber}" class="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Call
                   </a>` 
                : '<span class="text-xs text-gray-400">No Phone</span>';

            // Smaller headers (text-base) and details (text-xs)
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="overflow-hidden">
                        <h3 class="font-bold text-gray-900 text-base truncate">${user['First Name']} ${user['Last Name']}</h3>
                        <div class="text-xs text-gray-500 mt-0.5 truncate">${user['Store Name'] || 'No Store Name'}</div>
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="grid grid-cols-2 gap-1 text-xs mt-1">
                    <div class="text-gray-500">
                        <span class="block text-[10px] uppercase text-gray-400 font-semibold">LGA</span>
                        ${user['LGA'] || '-'}
                    </div>
                    <div class="text-gray-500">
                         <span class="block text-[10px] uppercase text-gray-400 font-semibold">Last Sale</span>
                         ${formatDate(user['Created Date'])}
                    </div>
                </div>

                <div class="text-xs text-gray-600 border-t border-gray-100 pt-2 mt-1 truncate">
                     ${user['Store Address'] || 'N/A'}
                </div>

                <div class="flex justify-between items-center pt-1 mt-1">
                    ${phoneLink}
                    <div class="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">AE: ${user.assignedAE}</div>
                </div>
            `;
            mobileFragment.appendChild(card);
        });
        
        monitorTable.appendChild(fragment);
        monitorMobileList.appendChild(mobileFragment);
    };

    const handleSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        const filteredUsers = assignedUsers.filter(user => {
            const fullName = `${user['First Name']} ${user['Last Name']}`.toLowerCase();
            const phone = (user['Phone Number'] || '').toLowerCase();
            const storeName = (user['Store Name'] || '').toLowerCase();
            const lga = (user['LGA'] || '').toLowerCase();
            const ae = (user.assignedAE || '').toLowerCase();

            return fullName.includes(searchTerm) ||
                   phone.includes(searchTerm) ||
                   storeName.includes(searchTerm) ||
                   lga.includes(searchTerm) ||
                   ae.includes(searchTerm);
        });
        renderTable(filteredUsers);
    };

    const refreshStatuses = async () => {
        // Support both V1 structure and V2 structure
        const apiBase = monitorData.apiBaseUrl || monitorData.api;
        const startDateProp = monitorData.reactivationStartDate || (monitorData.d2 ? monitorData.d2.e : null);

        if (!apiBase || !startDateProp) {
            alert('Missing API configuration. Cannot refresh statuses.');
            return;
        }

        refreshBtn.disabled = true;
        refreshBtnText.textContent = 'Refreshing...';
        refreshIcon.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        try {
            const reactivationStart = new Date(startDateProp + 'T00:00:00');
            const startDate = new Date(reactivationStart);
            startDate.setDate(startDate.getDate() - 1); 
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 1); 
            const startDateStr = toYYYYMMDD(startDate);
            const endDateStr = toYYYYMMDD(endDate);
            const retentionEndpoint = apiBase.replace('/churn', '/retention');
            const url = `${retentionEndpoint}?download=retained-user-stats&startDate=${startDateStr}&endDate=${endDateStr}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
            
            const csvText = await response.text();
            const result = await new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: resolve,
                    error: reject
                });
            });

            const activePhoneNumbers = new Set(result.data.map(row => row['Phone Number']));
            assignedUsers.forEach(user => {
                user.status = activePhoneNumbers.has(user['Phone Number']) ? 'Reactivated' : 'Churned';
            });

            handleSearch(); 
        } catch (error) {
            console.error('Error refreshing statuses:', error);
            alert(`Failed to refresh statuses: ${error.message}`);
        } finally {
            refreshBtn.disabled = false;
            refreshBtnText.textContent = 'Refresh Status';
            refreshIcon.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
        }
    };

    const updateViewMode = () => {
        // REQ 3: Explicitly show elements here. They are hidden by default in HTML.
        if (isAgentView) {
            copyAgentLinkBtn.classList.add('hidden');
            viewAsAdminBtn.classList.remove('hidden');
            // Reactivated card visibility is now handled by renderTable
            timeRemainingCard.classList.remove('hidden'); 
            searchInput.value = '';
            renderTable([]);
        } else {
            copyAgentLinkBtn.classList.remove('hidden');
            viewAsAdminBtn.classList.add('hidden');
            reactivatedCard.classList.remove('hidden');
            timeRemainingCard.classList.remove('hidden');
            renderTable(assignedUsers);
        }
    };

    // --- Admin Login Logic ---
    viewAsAdminBtn.addEventListener('click', () => {
        adminLoginOverlay.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminLoginError.textContent = '';
        adminPasswordInput.focus();
    });

    const hideAdminLogin = () => {
        adminLoginOverlay.classList.add('hidden');
    };

    cancelLoginBtn.addEventListener('click', hideAdminLogin);
    adminLoginOverlay.addEventListener('click', (e) => {
        if (e.target === adminLoginOverlay) hideAdminLogin();
    });

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput.value === 'fieldwork') {
            isAgentView = false;
            updateViewMode();
            hideAdminLogin();
        } else {
            adminLoginError.textContent = 'Incorrect password.';
            adminPasswordInput.select();
        }
    });

    // --- Copy Agent Link Logic ---
    copyAgentLinkBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'agent');
        navigator.clipboard.writeText(url.toString()).then(() => {
            const originalText = copyAgentLinkBtn.innerHTML;
            copyAgentLinkBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
            `;
            copyAgentLinkBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            copyAgentLinkBtn.classList.add('bg-gray-700', 'hover:bg-gray-800');
            
            setTimeout(() => {
                copyAgentLinkBtn.innerHTML = originalText;
                copyAgentLinkBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                copyAgentLinkBtn.classList.remove('bg-gray-700', 'hover:bg-gray-800');
            }, 2000);
        });
    });

    // Initialization
    if (decodeMonitorData()) {
        // If V2, we need to hydrate data first
        if (monitorData.v === 2) {
            // NOTE: updateViewMode called AFTER hydration to prevent flash of empty tables/wrong UI
            hydrateMonitorData().then(success => {
                if (success) {
                    updateMonitorInfo();
                    updateTimeRemaining();
                    updateViewMode(); // Call this here for V2 to respect loaded data
                    refreshStatuses();
                    // Start timer only after successful load
                    setInterval(updateTimeRemaining, 60000);
                }
            });
        } else {
            // Legacy load
            updateMonitorInfo();
            updateTimeRemaining();
            updateViewMode(); 
            refreshStatuses();
            setInterval(updateTimeRemaining, 60000);
        }

        // Event Listeners
        refreshBtn.addEventListener('click', refreshStatuses);
        searchInput.addEventListener('input', handleSearch);
    }
});