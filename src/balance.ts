import { 
  type Address, 
  type PublicClient, 
  type Hex,
  encodeAbiParameters,
  keccak256,
  parseAbiItem,
  toHex,
  pad,
  hexToBigInt,
  encodePacked
} from "viem";
import { balanceCache } from "./cache";
import type { ViemPublicClient } from "./types";

/**
 * Generate mock data for a given ERC20 token balance
 * @param client - The viem PublicClient instance
 * @param tokenAddress - The address of the ERC20 token
 * @param holderAddress - The address of the holder, used to find the balance slot
 * @param mockAddress - The user address to mock the balance for
 * @param mockBalance - The balance to mock the balance for, if not provided, defaults to the balance of the holder
 * @param maxSlots - The maximum number of slots to search
 * @returns An object containing the slot and balance
 *
 */
export const generateMockBalanceData = async (
  client: ViemPublicClient,
  {
    tokenAddress,
    holderAddress,
    mockAddress,
    mockBalanceAmount,
    maxSlots = 30,
  }: {
    tokenAddress: Address;
    holderAddress: Address;
    mockAddress: Address;
    mockBalanceAmount?: string;
    maxSlots?: number;
  }
): Promise<{
  slot: Hex;
  balance: Hex;
  isVyper: boolean;
}> => {
  // get the slot for token balance mapping: mapping(address => uint256)
  const { slot, balance, isVyper } = await getErc20BalanceStorageSlot(
    client,
    tokenAddress,
    holderAddress,
    maxSlots
  );

  // make sure its padded to 32 bytes, and convert to a BigNumber
  const mockBalanceHex = pad(
    toHex(mockBalanceAmount ? BigInt(mockBalanceAmount) : balance),
    { size: 32 }
  );

  // Calculate the storage slot key
  let index: Hex;
  if (!isVyper) {
    index = keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [mockAddress, hexToBigInt(slot)]
      )
    );
  } else {
    // if vyper, we need to use the keccak256(abi.encode(slot, address(this))) instead of keccak256(abi.encode(address(this), slot))
    index = keccak256(
      encodeAbiParameters(
        [{ type: "uint256" }, { type: "address" }],
        [hexToBigInt(slot), mockAddress]
      )
    );
  }

  return {
    slot: index,
    balance: mockBalanceHex,
    isVyper,
  };
};

/**
 * Get the storage slot for a given ERC20 token balance
 * @param client - The viem PublicClient instance
 * @param erc20Address - The address of the ERC20 token
 * @param holderAddress - The address of the holder, used to find the balance slot
 * @param maxSlots - The maximum number of slots to search
 * @returns An object containing the slot and balance
 *
 * - This uses a brute force approach to find the storage slot for the balance of the holder, so we can mock it. There are better ways to do this outside of just interacting directly with the contract over RPC, but its difficult to do so without needing to setup more tools/infra, especially for multi chain supoprt and gas estimation at runtime.
 */
export const getErc20BalanceStorageSlot = async (
  client: ViemPublicClient,
  erc20Address: Address,
  holderAddress: Address,
  maxSlots = 30
): Promise<{
  slot: Hex;
  balance: bigint;
  isVyper: boolean;
}> => {
  // check the cache
  const cachedValue = balanceCache.get(erc20Address.toLowerCase());
  if (cachedValue) {
    if (cachedValue.isVyper) {
      const { vyperSlotHash } = calculateBalanceVyperStorageSlot(holderAddress, cachedValue.slot)
      const vyperBalance = await client.getStorageAt({
        address: erc20Address,
        slot: vyperSlotHash
      });
      return {
        slot: toHex(cachedValue.slot),
        balance: hexToBigInt(vyperBalance!),
        isVyper: true,
      };
    } else {
      const { slotHash } = calculateBalanceSolidityStorageSlot(holderAddress, cachedValue.slot);
      const balance = await client.getStorageAt({
        address: erc20Address,
        slot: slotHash
      });
      return {
        slot: toHex(cachedValue.slot),
        balance: hexToBigInt(balance!),
        isVyper: false,
      }
    }
  }

  // Get the balance of the holder, that we can use to find the slot
  const userBalance = await getErc20Balance(
    client,
    erc20Address,
    holderAddress
  );
  // If the balance is 0, we can't find the slot, so throw an error
  if (userBalance === 0n) {
    throw new Error("User has no balance");
  }
  // We iterate over maxSlots, maxSlots is set to 100 by default, its unlikely that an erc20 token will be using up more than 100 slots tbh
  // For each slot, we compute the storage slot key [holderAddress, slot index] and get the value at that storage slot
  // If the value at the storage slot is equal to the balance, return the slot as we have found the correct slot for balances
  for (let i = 0; i < maxSlots; i++) {
    const { slotHash } = calculateBalanceSolidityStorageSlot(holderAddress, i);
    const balance = await client.getStorageAt({
      address: erc20Address,
      slot: slotHash
    });

    if (hexToBigInt(balance!) === userBalance) {
      balanceCache.set(erc20Address.toLowerCase(), {
        slot: i,
        isVyper: false,
        ts: Date.now()
      })

      return {
        slot: toHex(i),
        balance: hexToBigInt(balance!),
        isVyper: false,
      };
    }

    const { vyperSlotHash } = calculateBalanceVyperStorageSlot(holderAddress, i)
    const vyperBalance = await client.getStorageAt({
      address: erc20Address,
      slot: vyperSlotHash
    });

    if (hexToBigInt(vyperBalance!) === userBalance) {
      balanceCache.set(erc20Address.toLowerCase(), {
        slot: i,
        isVyper: true,
        ts: Date.now()
      })

      return {
        slot: toHex(i),
        balance: hexToBigInt(vyperBalance!),
        isVyper: true,
      };
    }
  }
  throw new Error("Unable to find balance slot");
};


const calculateBalanceSolidityStorageSlot = (holderAddress: Address, slotNumber: number) => {
  const slotHash = keccak256(
    encodePacked(
      ["uint256", "uint256"],
      [BigInt(holderAddress), BigInt(slotNumber)]
    )
  );
  return { slotHash }
}

const calculateBalanceVyperStorageSlot = (holderAddress: Address, slotNumber: number) => {
  // create hash via vyper storage layout, which uses keccak256(abi.encode(slot, address(this))) instead of keccak256(abi.encode(address(this), slot))
  const vyperSlotHash = keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }],
      [BigInt(slotNumber), holderAddress]
    )
  );
  return { vyperSlotHash }
}

/**
 * Get the balance of a given address for a given ERC20 token
 * @param client - The viem PublicClient instance
 * @param address - The address of the ERC20 token
 * @param addressToCheck - The address to check the balance of
 * @returns The balance of the address
 *
 */
export const getErc20Balance = async (
  client: ViemPublicClient,
  address: Address,
  addressToCheck: Address
): Promise<bigint> => {
  const balance = await client.readContract({
    address,
    abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
    functionName: 'balanceOf',
    args: [addressToCheck]
  });
  return balance;
};