// This file will hold common JS for frontend interactivity

// Sidebar collapse for mobile (optional)
const sidebar = document.querySelector('.sidebar');
const toggleSidebar = () => {
  sidebar.classList.toggle('collapsed');
};

// Example function for alerts (plan operations)
function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} mt-2`;
  alertDiv.innerText = message;
  document.body.prepend(alertDiv);
  setTimeout(()=>alertDiv.remove(), 3000);
}

// Net Salary calculation (can be reused)
function calculateNetSalary(grossId, deductionsId, expensesId, netId){
  const gross = document.getElementById(grossId);
  const deductions = document.getElementById(deductionsId);
  const expenses = document.getElementById(expensesId);
  const net = document.getElementById(netId);

  [gross, deductions, expenses].forEach(input => {
    input.addEventListener('input', ()=>{
      net.value = (Number(gross.value)||0) - (Number(deductions.value)||0) - (Number(expenses.value)||0);
    });
  });
}