// Virtual module stub for ALL @solana/* and @solana-program/* packages
// Uses a Proxy to handle any export name dynamically

// Create a proxy that returns throw functions for any property access
const handler: ProxyHandler<object> = {
    get(_target, prop) {
        if (prop === '__esModule') return true;
        if (prop === 'default') return {};
        if (typeof prop === 'symbol') return undefined;
        // Return a stub function that throws
        return function (..._args: unknown[]) {
            throw new Error(`Solana is not supported: ${String(prop)}`);
        };
    }
};

// Export a proxy that handles any named export
const proxy = new Proxy({}, handler);

// Re-export common patterns
export const getTransactionDecoder = proxy.getTransactionDecoder;
export const getBase64Decoder = proxy.getBase64Decoder;
export const getBase58Encoder = proxy.getBase58Encoder;
export const getStructEncoder = proxy.getStructEncoder;
export const getOptionEncoder = proxy.getOptionEncoder;
export const getAddressEncoder = proxy.getAddressEncoder;
export const getU32Encoder = proxy.getU32Encoder;
export const getU64Encoder = proxy.getU64Encoder;
export const getEnumEncoder = proxy.getEnumEncoder;
export const getArrayEncoder = proxy.getArrayEncoder;
export const getBytesEncoder = proxy.getBytesEncoder;
export const getStringEncoder = proxy.getStringEncoder;
export const getDiscriminatedUnionEncoder = proxy.getDiscriminatedUnionEncoder;

// @solana/web3.js exports
export const Connection = class Connection { };
export const PublicKey = class PublicKey { };
export const Transaction = class Transaction { };
export const Keypair = class Keypair { };
export const SystemProgram = {};
export const LAMPORTS_PER_SOL = 1000000000;

// Default export
export default proxy;
