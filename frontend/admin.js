document.addEventListener('DOMContentLoaded', () => {
  const limitsTableBody = document.getElementById('limits-table-body');
  const logsContainer = document.getElementById('logs-container');
  const updatePrizesBtn = document.getElementById('update-prizes-btn');
  const resetBtn = document.getElementById('reset-btn');
  const deleteBtn = document.getElementById('delete-btn');

  // Timing controls
  const durDisplay = document.getElementById('dur-display');
  const durDecBtn = document.getElementById('dur-dec');
  const durIncBtn = document.getElementById('dur-inc');
  const durSaveBtn = document.getElementById('dur-save');
  const firstSpinDisplay = document.getElementById('first-spin-display');
  const elapsedDisplay = document.getElementById('elapsed-display');
  const restartClockBtn = document.getElementById('restart-clock-btn');

  // Probability gauge
  const probBar = document.getElementById('prob-bar');
  const probValue = document.getElementById('prob-value');

  // Manual probability override
  const probModeBadge     = document.getElementById('prob-mode-badge');
  const manualProbSlider  = document.getElementById('manual-prob-slider');
  const manualProbInput   = document.getElementById('manual-prob-input');
  const probApplyBtn      = document.getElementById('prob-apply-btn');
  const probClearBtn      = document.getElementById('prob-clear-btn');

  // Keep slider and number input in sync
  manualProbSlider.addEventListener('input', () => {
    manualProbInput.value = manualProbSlider.value;
  });
  manualProbInput.addEventListener('input', () => {
    const v = Math.min(100, Math.max(0, parseFloat(manualProbInput.value) || 0));
    manualProbSlider.value = v;
  });

  let currentDurationHours = 6;
  let pendingDurationHours = 6;
  let firstSpinTime = null;
  let elapsedTimer = null;

  const formatPrizeName = (key) => {
    switch (key) {
      case 'tshirt': return 'T-Shirt';
      case 'cap': return 'Cap';
      case 'shoe_rack': return 'Shoe Rack';
      default: return key;
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      
      if (data.success) {
        // Render limits
        limitsTableBody.innerHTML = '';
        for (const [key, value] of Object.entries(data.data.prizes)) {
          limitsTableBody.innerHTML += `
            <tr>
              <td style="vertical-align: middle;">${formatPrizeName(key)}</td>
              <td>
                <input type="number" id="prize-input-${key}" class="prob-number-input" style="width: 80px;" min="0" value="${value}" />
              </td>
            </tr>
          `;
        }

        // Render timing
        if (data.data.timing) {
          currentDurationHours = data.data.timing.durationHours;
          pendingDurationHours = currentDurationHours;
          durDisplay.textContent = `${pendingDurationHours}h`;
          firstSpinTime = data.data.timing.firstSpinTime ? new Date(data.data.timing.firstSpinTime) : null;
          firstSpinDisplay.textContent = firstSpinTime ? firstSpinTime.toLocaleTimeString() : '—';
          startElapsedTimer();
        }

        // Render probability gauge
        if (data.data.winProbability !== undefined) {
          updateProbabilityDisplay(data.data.winProbability);
        }

        // Update manual override badge + slider
        const manualProb = data.data.manualProbability;
        if (manualProb !== null && manualProb !== undefined) {
          const pct = Math.round(manualProb * 100);
          probModeBadge.textContent = 'MANUAL';
          probModeBadge.className = 'mode-badge manual';
          manualProbSlider.value = pct;
          manualProbInput.value  = pct;
        } else {
          probModeBadge.textContent = 'AUTO';
          probModeBadge.className = 'mode-badge auto';
        }

        // Render logs
        logsContainer.innerHTML = '';
        if (data.data.logs.length === 0) {
          logsContainer.innerHTML = `<p style="text-align: center; color: white; padding: 20px;">No winnings logged yet.</p>`;
        } else {
          data.data.logs.forEach(dayGroup => {
            let dayHtml = `
              <div style="margin-bottom: 20px;">
                <h3 style="color:#FFD700; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px; margin-bottom:10px;">
                  Day ${dayGroup.dayNumber} - ${dayGroup.dateString} <span style="font-size:0.8em; color:#A0A0B0;">(Total Spins: ${dayGroup.totalSpins})</span>
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Prize Won</th>
                    </tr>
                  </thead>
                  <tbody>
            `;
            
            dayGroup.entries.forEach(log => {
              const dateObj = new Date(log.timestamp);
              const timeStr = dateObj.toLocaleTimeString();
              dayHtml += `
                <tr>
                  <td>${timeStr}</td>
                  <td>${formatPrizeName(log.prize)}</td>
                </tr>
              `;
            });
            
            dayHtml += `
                  </tbody>
                </table>
              </div>
            `;
            
            logsContainer.innerHTML += dayHtml;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      alert('Error fetching stats.');
    }
  };

  updatePrizesBtn.addEventListener('click', async () => {
    const tshirt = parseInt(document.getElementById('prize-input-tshirt')?.value, 10);
    const cap = parseInt(document.getElementById('prize-input-cap')?.value, 10);
    const shoe_rack = parseInt(document.getElementById('prize-input-shoe_rack')?.value, 10);

    const updates = {};
    if (!isNaN(tshirt)) updates.tshirt = tshirt;
    if (!isNaN(cap)) updates.cap = cap;
    if (!isNaN(shoe_rack)) updates.shoe_rack = shoe_rack;

    if (Object.keys(updates).length === 0) return;

    try {
      const response = await fetch('/api/admin/prizes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        alert('Prize stock updated successfully.');
        fetchStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating prizes:', error);
      alert('Error updating prizes.');
    }
  });

  resetBtn.addEventListener('click', async () => {
    if(!confirm("Are you sure you want to reset all limits for today? This cannot be undone.")) return;

    try {
      const response = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await response.json();
      if(data.success) {
        alert(data.message);
        fetchStats();
      }
    } catch (error) {
      console.error('Error resetting limits:', error);
      alert('Error resetting limits.');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if(!confirm("WARNING: Are you sure you want to DELETE ALL RECORDS? This completely resets the entire system (all day histories and daily limits). This CANNOT BE UNDONE!")) return;

    try {
      const response = await fetch('/api/admin/records', { method: 'DELETE' });
      const data = await response.json();
      if(data.success) {
        alert(data.message);
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Error deleting records.');
    }
  });

  // ---- Timing controls ----

  function startElapsedTimer() {
    if (elapsedTimer) clearInterval(elapsedTimer);
    updateElapsed();
    elapsedTimer = setInterval(() => {
      updateElapsed();
      // Re-fetch stats every 30s so probability gauge stays live
      fetchStats();
    }, 30000);
  }

  function updateProbabilityDisplay(prob) {
    const pct = (prob * 100).toFixed(2);
    const barPct = Math.min(prob * 100, 100);
    probValue.textContent = `${pct}%`;
    probBar.style.width = `${Math.max(barPct, 0.5)}%`;
    // Colour the value label: green → yellow → red
    if (prob < 0.1) {
      probValue.style.color = '#00e676';
    } else if (prob < 0.25) {
      probValue.style.color = '#FFD700';
    } else {
      probValue.style.color = '#e94560';
    }
  }

  function updateElapsed() {
    if (!firstSpinTime) { elapsedDisplay.textContent = '—'; return; }
    const elapsedMs = Date.now() - firstSpinTime.getTime();
    const totalMs = currentDurationHours * 60 * 60 * 1000;
    const elapsedH = Math.floor(elapsedMs / 3600000);
    const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
    const pct = Math.min((elapsedMs / totalMs) * 100, 100).toFixed(1);
    elapsedDisplay.textContent = `${elapsedH}h ${elapsedM}m elapsed of ${currentDurationHours}h (${pct}%)`;
  }

  durDecBtn.addEventListener('click', () => {
    if (pendingDurationHours > 0.5) {
      pendingDurationHours = Math.round((pendingDurationHours - 0.5) * 10) / 10;
      durDisplay.textContent = `${pendingDurationHours}h`;
    }
  });

  durIncBtn.addEventListener('click', () => {
    if (pendingDurationHours < 24) {
      pendingDurationHours = Math.round((pendingDurationHours + 0.5) * 10) / 10;
      durDisplay.textContent = `${pendingDurationHours}h`;
    }
  });

  durSaveBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/admin/timing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationHours: pendingDurationHours })
      });
      const data = await response.json();
      if (data.success) {
        currentDurationHours = data.data.durationHours;
        alert(`Distribution window saved: ${currentDurationHours} hours`);
        updateElapsed();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving duration:', error);
      alert('Network error.');
    }
  });

  restartClockBtn.addEventListener('click', async () => {
    if (!confirm('Restart the pacing clock from NOW? The probability engine will treat this moment as the first spin of the day.')) return;
    try {
      const response = await fetch('/api/admin/timing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restartClock: true })
      });
      const data = await response.json();
      if (data.success) {
        firstSpinTime = new Date(data.data.firstSpinTime);
        firstSpinDisplay.textContent = firstSpinTime.toLocaleTimeString();
        startElapsedTimer();
        alert('Pacing clock restarted from now.');
      }
    } catch (error) {
      console.error('Error restarting clock:', error);
      alert('Network error.');
    }
  });

  // Manual probability — Apply
  probApplyBtn.addEventListener('click', async () => {
    const value = parseFloat(manualProbInput.value);
    if (isNaN(value) || value < 0 || value > 100) {
      alert('Please enter a number between 0 and 100.');
      return;
    }
    try {
      const response = await fetch('/api/admin/probability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      const data = await response.json();
      if (data.success) {
        probModeBadge.textContent = 'MANUAL';
        probModeBadge.className = 'mode-badge manual';
        alert(`✅ Manual probability set to ${value}%`);
        fetchStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    }
  });

  // Manual probability — Clear (restore auto)
  probClearBtn.addEventListener('click', async () => {
    if (!confirm('Clear the manual override and restore the automatic algorithm?')) return;
    try {
      const response = await fetch('/api/admin/probability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: null })
      });
      const data = await response.json();
      if (data.success) {
        probModeBadge.textContent = 'AUTO';
        probModeBadge.className = 'mode-badge auto';
        alert('✅ Manual override cleared — auto algorithm restored.');
        fetchStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    }
  });

  // Initial load
  fetchStats();
});
