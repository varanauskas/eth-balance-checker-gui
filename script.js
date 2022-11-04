// Elements
const form = document.getElementById("form");
const balances = document.getElementById("balances");

// Populate form values from URLSearchParams
new URLSearchParams(window.location.search).forEach((value, name) => {
  const item = form.elements.namedItem(name);
  if (item) item.value = value;
});

// Form manipulation
function disableForm() {
  for (const element of form.elements) {
    element.disabled = true;
  }
}
function enableForm() {
  for (const element of form.elements) {
    element.disabled = false;
  }
}

// Number manipulation
function formatFixed(big, decimals) {
  const text = big.toString().padStart(decimals + 1, "0");
  console.log(text);
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
function submitForm(formData) {
  disableForm();
  getBalances(Object.fromEntries(formData))
    .then((result) => {
      balances.value = result
        .map(({ address, balance }) => `${address}\t${balance}`)
        .join("\n");
    })
    .catch((error) => (balances.value = error))
    .finally(enableForm);
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
