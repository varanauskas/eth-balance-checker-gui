// Elements
const form = document.getElementById("form");
const balances = document.getElementById("balances");
const exportLink = document.getElementById("export");

// Populate form values from URLSearchParams
new URLSearchParams(window.location.search).forEach((value, name) => {
  const item = form.elements.namedItem(name);
  if (item) item.value = value;
});

// Form manipulation
function setDisabled(disabled) {
  for (const element of form.elements) {
    element.disabled = disabled;
  }
  exportLink.disabled = disabled;
}

// Number manipulation
function formatFixed(big, decimals) {
  const text = big.toString().padStart(decimals + 1, "0");
  const index = text.length - decimals;
  const int = text.substring(0, index);
  const rem = text.substring(index);
  return `${int}.${rem}`;
}

// Constants
const balanceCheckerAbi = [
  {
    constant: true,
    inputs: [
      { name: "users", type: "address[]" },
      { name: "tokens", type: "address[]" },
    ],
    name: "balances",
    outputs: [{ name: "", type: "uint256[]" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];
const erc20Abi = [
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

// On form submit
async function getBalances({
  rpc,
  contract: contractAddress,
  token: tokenAddress,
  addresses: addressString,
}) {
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const balanceChecker = new ethers.Contract(
    contractAddress,
    balanceCheckerAbi,
    provider
  );
  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const addresses = addressString.split(/\r?\n/);
  if (addresses[addresses.length - 1].length === 0) addresses.pop();
  const result = await balanceChecker.balances(addresses, [tokenAddress]);
  const decimals = await token.decimals();
  return result.map((balanceBig, index) => ({
    address: addresses[index],
    balance: formatFixed(balanceBig, decimals),
  }));
}

function clearResults() {
  balances.innerHTML = "";
  balances.href = "data:,";
}

function updateResults(results) {
  for (const { address, balance } of results) {
    const row = balances.insertRow();
    const addressCell = document.createElement("th");
    addressCell.innerText = address;
    row.appendChild(addressCell);
    row.insertCell().innerText = balance;
  }
  const content = results.map(result => Object.values(result).join(',')).join('\n');
  exportLink.href = URL.createObjectURL(new Blob(["Address,Balance\n", content], { type: "text/plain" }));
}

function submitForm(formData) {
  setDisabled(true);
  getBalances(Object.fromEntries(formData))
    .then(updateResults)
    .catch(console.error)
    .finally(() => setDisabled(false));
}
if (form.reportValidity()) submitForm(new FormData(form));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(data);
  window.history.replaceState(null, null, url);
  submitForm(data);
});
