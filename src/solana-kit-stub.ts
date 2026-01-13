// Stub for @solana/* packages - Privy's optional Solana dependencies
// This app doesn't use Solana, so we provide empty stubs

// @solana/kit exports
export const getTransactionDecoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getBase64Decoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getBase58Encoder = () => {
    throw new Error('Solana is not supported in this application');
};

// @solana-program/encoders exports
export const getStructEncoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getOptionEncoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getAddressEncoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getU32Encoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getU64Encoder = () => {
    throw new Error('Solana is not supported in this application');
};

// @solana/web3.js exports
export const Connection = class { };
export const PublicKey = class { };
export const Transaction = class { };

// Export empty defaults for any other imports
export default {};
