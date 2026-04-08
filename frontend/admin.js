document.addEventListener('DOMContentLoaded', () => {
  const limitsTableBody = document.getElementById('limits-table-body');
  const logsContainer = document.getElementById('logs-container');
  const resetBtn = document.getElementById('reset-btn');
  const deleteBtn = document.getElementById('delete-btn');

  // Format the name elegantly
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
              <td>${formatPrizeName(key)}</td>
              <td>${value}</td>
            </tr>
          `;
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

  resetBtn.addEventListener('click', async () => {
    if(!confirm("Are you sure you want to reset all limits for today? This cannot be undone.")) return;

    try {
      const response = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await response.json();
      if(data.success) {
        alert(data.message);
        fetchStats(); // refresh
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
        fetchStats(); // refresh
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Error deleting records.');
    }
  });

  // Initial load
  fetchStats();
});
