// Stub for @solana/kit - Privy's optional Solana dependency
// This app doesn't use Solana, so we provide empty stubs

export const getTransactionDecoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getBase64Decoder = () => {
    throw new Error('Solana is not supported in this application');
};

export const getBase58Encoder = () => {
    throw new Error('Solana is not supported in this application');
};

// Export empty defaults for any other imports
export default {};
