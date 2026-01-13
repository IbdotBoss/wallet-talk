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
export const getTransactionEncoder = proxy.getTransactionEncoder;
export const getBase64Decoder = proxy.getBase64Decoder;
export const getBase64Encoder = proxy.getBase64Encoder;
export const getBase58Encoder = proxy.getBase58Encoder;
export const getBase58Decoder = proxy.getBase58Decoder;
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

// Decoder exports (MISSING - causing the build failure)
export const getEnumDecoder = proxy.getEnumDecoder;
export const getStructDecoder = proxy.getStructDecoder;
export const getArrayDecoder = proxy.getArrayDecoder;
export const getBytesDecoder = proxy.getBytesDecoder;
export const getStringDecoder = proxy.getStringDecoder;
export const getU32Decoder = proxy.getU32Decoder;
export const getU64Decoder = proxy.getU64Decoder;
export const getU8Decoder = proxy.getU8Decoder;
export const getU16Decoder = proxy.getU16Decoder;
export const getU128Decoder = proxy.getU128Decoder;
export const getOptionDecoder = proxy.getOptionDecoder;
export const getAddressDecoder = proxy.getAddressDecoder;
export const getDiscriminatedUnionDecoder = proxy.getDiscriminatedUnionDecoder;
export const getBooleanDecoder = proxy.getBooleanDecoder;

// Codec combiners
export const combineCodec = proxy.combineCodec;
export const fixEncoderSize = proxy.fixEncoderSize;
export const fixDecoderSize = proxy.fixDecoderSize;
export const transformEncoder = proxy.transformEncoder;
export const transformDecoder = proxy.transformDecoder;

// Additional encoders that may be needed
export const getU8Encoder = proxy.getU8Encoder;
export const getU16Encoder = proxy.getU16Encoder;
export const getU128Encoder = proxy.getU128Encoder;
export const getBooleanEncoder = proxy.getBooleanEncoder;
export const getTupleEncoder = proxy.getTupleEncoder;
export const getTupleDecoder = proxy.getTupleDecoder;
export const getMapEncoder = proxy.getMapEncoder;
export const getMapDecoder = proxy.getMapDecoder;
export const getSetEncoder = proxy.getSetEncoder;
export const getSetDecoder = proxy.getSetDecoder;
export const getDataEnumEncoder = proxy.getDataEnumEncoder;
export const getDataEnumDecoder = proxy.getDataEnumDecoder;
export const getScalarEnumEncoder = proxy.getScalarEnumEncoder;
export const getScalarEnumDecoder = proxy.getScalarEnumDecoder;
export const getConstantEncoder = proxy.getConstantEncoder;
export const getConstantDecoder = proxy.getConstantDecoder;
export const getHiddenPrefixEncoder = proxy.getHiddenPrefixEncoder;
export const getHiddenPrefixDecoder = proxy.getHiddenPrefixDecoder;
export const getHiddenSuffixEncoder = proxy.getHiddenSuffixEncoder;
export const getHiddenSuffixDecoder = proxy.getHiddenSuffixDecoder;
export const getUnionEncoder = proxy.getUnionEncoder;
export const getUnionDecoder = proxy.getUnionDecoder;
export const getZeroableOptionEncoder = proxy.getZeroableOptionEncoder;
export const getZeroableOptionDecoder = proxy.getZeroableOptionDecoder;
export const getNullableEncoder = proxy.getNullableEncoder;
export const getNullableDecoder = proxy.getNullableDecoder;
export const padLeftEncoder = proxy.padLeftEncoder;
export const padLeftDecoder = proxy.padLeftDecoder;
export const padRightEncoder = proxy.padRightEncoder;
export const padRightDecoder = proxy.padRightDecoder;

// Sysvar exports
export const fetchSysvarClock = proxy.fetchSysvarClock;
export const fetchSysvarRent = proxy.fetchSysvarRent;
export const fetchSysvarEpochSchedule = proxy.fetchSysvarEpochSchedule;
export const fetchSysvarSlotHashes = proxy.fetchSysvarSlotHashes;
export const fetchSysvarStakeHistory = proxy.fetchSysvarStakeHistory;
export const SYSVAR_CLOCK_ADDRESS = 'SysvarC1ock11111111111111111111111111111111';
export const SYSVAR_RENT_ADDRESS = 'SysvarRent111111111111111111111111111111111';

// Address/Account exports
export const getAddressFromPublicKey = proxy.getAddressFromPublicKey;
export const isAddress = proxy.isAddress;
export const assertIsAddress = proxy.assertIsAddress;
export const address = proxy.address;
export const createNoopSigner = proxy.createNoopSigner;
export const createSignerFromKeyPair = proxy.createSignerFromKeyPair;
export const createKeyPairSignerFromBytes = proxy.createKeyPairSignerFromBytes;
export const createKeyPairSignerFromPrivateKeyBytes = proxy.createKeyPairSignerFromPrivateKeyBytes;
export const generateKeyPair = proxy.generateKeyPair;
export const createKeyPairFromBytes = proxy.createKeyPairFromBytes;
export const isTransactionSigner = proxy.isTransactionSigner;

// RPC exports
export const createSolanaRpc = proxy.createSolanaRpc;
export const createSolanaRpcSubscriptions = proxy.createSolanaRpcSubscriptions;
export const devnet = proxy.devnet;
export const mainnet = proxy.mainnet;
export const testnet = proxy.testnet;

// Transaction exports
export const createTransaction = proxy.createTransaction;
export const setTransactionFeePayer = proxy.setTransactionFeePayer;
export const appendTransactionInstruction = proxy.appendTransactionInstruction;
export const signTransaction = proxy.signTransaction;
export const sendAndConfirmTransaction = proxy.sendAndConfirmTransaction;
export const getSignatureFromTransaction = proxy.getSignatureFromTransaction;
export const getBase64EncodedWireTransaction = proxy.getBase64EncodedWireTransaction;
export const getCompiledTransactionMessageDecoder = proxy.getCompiledTransactionMessageDecoder;
export const isTransactionModifyingSigner = proxy.isTransactionModifyingSigner;
export const isTransactionPartialSigner = proxy.isTransactionPartialSigner;
export const pipe = proxy.pipe;
export const createTransactionMessage = proxy.createTransactionMessage;
export const setTransactionMessageFeePayer = proxy.setTransactionMessageFeePayer;
export const setTransactionMessageFeePayerSigner = proxy.setTransactionMessageFeePayerSigner;
export const setTransactionMessageLifetimeUsingBlockhash = proxy.setTransactionMessageLifetimeUsingBlockhash;
export const appendTransactionMessageInstruction = proxy.appendTransactionMessageInstruction;
export const appendTransactionMessageInstructions = proxy.appendTransactionMessageInstructions;
export const partiallySignTransactionMessageWithSigners = proxy.partiallySignTransactionMessageWithSigners;
export const prependTransactionMessageInstruction = proxy.prependTransactionMessageInstruction;
export const compileTransaction = proxy.compileTransaction;
export const decompileTransactionMessage = proxy.decompileTransactionMessage;
export const fetchAddressesForLookupTables = proxy.fetchAddressesForLookupTables;

// Program exports
export const getProgramDerivedAddress = proxy.getProgramDerivedAddress;
export const findProgramDerivedAddress = proxy.findProgramDerivedAddress;
export const TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ADDRESS = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// Error exports
export const isSolanaError = proxy.isSolanaError;
export const SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM = 0;

// Compute budget exports
export const estimateComputeUnitLimitFactory = proxy.estimateComputeUnitLimitFactory;
export const getSetComputeUnitLimitInstruction = proxy.getSetComputeUnitLimitInstruction;
export const setTransactionMessageComputeUnitPrice = proxy.setTransactionMessageComputeUnitPrice;

// Token program exports
export const fetchMint = proxy.fetchMint;
export const findAssociatedTokenPda = proxy.findAssociatedTokenPda;
export const getTransferCheckedInstruction = proxy.getTransferCheckedInstruction;
export const getCreateAssociatedTokenIdempotentInstruction = proxy.getCreateAssociatedTokenIdempotentInstruction;
export const getTransferInstruction = proxy.getTransferInstruction;

// System program exports
export const getTransferSolInstruction = proxy.getTransferSolInstruction;

// @solana/web3.js exports
export const Connection = class Connection { };
export const PublicKey = class PublicKey { };
export const Transaction = class Transaction { };
export const Keypair = class Keypair { };
export const SystemProgram = {};
export const LAMPORTS_PER_SOL = 1000000000;

// Default export
export default proxy;
