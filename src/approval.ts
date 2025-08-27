import { 
  type Address, 
  type PublicClient, 
  type Hex,
  encodeAbiParameters,
  keccak256,
  parseAbiItem,
  toHex,
  pad,
  hexToBigInt
} from "viem";
import { approvalCache } from "./cache";
import type { ViemPublicClient } from "./types";

/**
 * Generate mock approval data for a given ERC20 token
 * @param client - The viem PublicClient instance
 * @param tokenAddress - The address of the ERC20 token
 * @param ownerAddress - The address of the owner
 * @param spenderAddress - The address of the spender
 * @param mockAddress - The address to mock the approval for
 * @param mockApprovalAmount - The amount to mock the approval for
 * @param maxSlots - The maximum number of slots to search
 * @returns An object containing the slot and approval data
 *
 */
export const generateMockApprovalData = async (
  client: ViemPublicClient,
  {
    tokenAddress,
    ownerAddress,
    spenderAddress,
    mockAddress,
    mockApprovalAmount,
    maxSlots = 30,
    useFallbackSlot = false
  }: {
    tokenAddress: Address;
    ownerAddress: Address;
    spenderAddress: Address;
    mockAddress: Address;
    mockApprovalAmount: string;
    maxSlots?: number;
    useFallbackSlot?: boolean;
  }
): Promise<{
  slot: Hex;
  approval: Hex;
  isVyper: boolean;
}> => {
  // get the slot for the approval mapping, mapping(address account => mapping(address spender => uint256))
  const { slot, isVyper } = await getErc20ApprovalStorageSlot(
    client,
    tokenAddress,
    ownerAddress,
    spenderAddress,
    maxSlots,
    useFallbackSlot

  );

  // make sure its padded to 32 bytes, and convert to a BigNumber
  const mockApprovalHex = pad(
    toHex(BigInt(mockApprovalAmount)),
    { size: 32 }
  );

  let index: Hex;
  if (!isVyper) {
    const newSlotHash = keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [mockAddress, hexToBigInt(slot)]
      )
    );
    // Calculate the storage slot key
    index = keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "bytes32" }],
        [spenderAddress, newSlotHash]
      )
    );
  } else {
    const newSlotHash = keccak256(
      encodeAbiParameters(
        [{ type: "uint256" }, { type: "address" }],
        [hexToBigInt(slot), mockAddress]
      )
    );
    // Calculate the storage slot key
    index = keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }],
        [newSlotHash, spenderAddress]
      )
    );
  }

  return {
    slot: index,
    approval: mockApprovalHex,
    isVyper,
  };
};

/**
 * Get the storage slot for a given ERC20 token approval
 * @param client - The viem PublicClient instance
 * @param erc20Address - The address of the ERC20 token
 * @param ownerAddress - The address of the owner, used to find the approval slot
 * @param spenderAddress - The address of the spender, used to find the approval slot
 * @param maxSlots - The maximum number of slots to search
 * @returns The slot for the approval
 *
 * - This uses a brute force approach similar to the balance slot search. See the balance slot search comment for more details.
 */
export const getErc20ApprovalStorageSlot = async (
  client: ViemPublicClient,
  erc20Address: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  maxSlots: number,
  useFallbackSlot = false
): Promise<{
  slot: Hex;
  slotHash: Hex;
  isVyper: boolean;
}> => {
  // check the cache
  const cachedValue = approvalCache.get(erc20Address.toLowerCase());
  if (cachedValue) {
    if (cachedValue.isVyper) {
      const { vyperSlotHash } = calculateApprovalVyperStorageSlot(ownerAddress, spenderAddress, cachedValue.slot)
      return {
        slot: toHex(cachedValue.slot),
        slotHash: vyperSlotHash,
        isVyper: true,
      };

    } else {
      const { slotHash } = calculateApprovalSolidityStorageSlot(ownerAddress, spenderAddress, cachedValue.slot)
      return {
        slot: toHex(cachedValue.slot),
        slotHash: slotHash,
        isVyper: false,
      }
    }
  }

  // Get the approval for the spender, that we can use to find the slot
  let approval = await getErc20Approval(
    client,
    erc20Address,
    ownerAddress,
    spenderAddress
  );

  if (approval > 0n) {
    for (let i = 0; i < maxSlots; i++) {
      const { storageSlot, slotHash } = calculateApprovalSolidityStorageSlot(ownerAddress, spenderAddress, i)
      // Get the value at the storage slot
      const storageValue = await client.getStorageAt({
        address: erc20Address,
        slot: storageSlot
      });
      // If the value at the storage slot is equal to the approval, return the slot as we have found the correct slot for approvals
      if (hexToBigInt(storageValue!) === approval) {
        approvalCache.set(erc20Address.toLowerCase(), {
          slot: i,
          isVyper: false,
          ts: Date.now()
        });
        return {
          slot: toHex(i),
          slotHash: slotHash,
          isVyper: false,
        };
      }

      const { vyperStorageSlot, vyperSlotHash } = calculateApprovalVyperStorageSlot(ownerAddress, spenderAddress, i)
      const vyperStorageValue = await client.getStorageAt({
        address: erc20Address,
        slot: vyperStorageSlot
      });

      if (hexToBigInt(vyperStorageValue!) === approval) {
        approvalCache.set(erc20Address.toLowerCase(), {
          slot: i,
          isVyper: false,
          ts: Date.now()
        });

        return {
          slot: toHex(i),
          slotHash: vyperSlotHash,
          isVyper: true,
        };
      }
    }
    if (!useFallbackSlot)
      throw new Error("Approval does not exist");
  }

  if (useFallbackSlot) {
    // if useFallBackSlot = true, then we are just going to assume the slot is at the slot which is most common for erc20 tokens. for approvals, this is slot #10

    const fallbackSlot = 10;
    // check solidity, then check vyper.
    // (dont have an easy way to check if a contract is solidity/vyper)
    const { storageSlot, slotHash } = calculateApprovalSolidityStorageSlot(ownerAddress, spenderAddress, fallbackSlot)
    // Get the value at the storage slot
    const storageValue = await client.getStorageAt({
      address: erc20Address,
      slot: storageSlot
    });
    // If the value at the storage slot is equal to the approval, return the slot as we have found the correct slot for approvals
    if (hexToBigInt(storageValue!) === approval) {
      approvalCache.set(erc20Address.toLowerCase(), {
        slot: fallbackSlot,
        isVyper: false,
        ts: Date.now()
      });

      return {
        slot: toHex(fallbackSlot),
        slotHash: slotHash,
        isVyper: false,
      };
    }

    // check vyper
    const { vyperStorageSlot, vyperSlotHash } = calculateApprovalVyperStorageSlot(ownerAddress, spenderAddress, fallbackSlot)
    const vyperStorageValue = await client.getStorageAt({
      address: erc20Address,
      slot: vyperStorageSlot
    });
    if (hexToBigInt(vyperStorageValue!) === approval) {
      approvalCache.set(erc20Address.toLowerCase(), {
        slot: fallbackSlot,
        isVyper: true,
        ts: Date.now()
      });

      return {
        slot: toHex(fallbackSlot),
        slotHash: vyperSlotHash,
        isVyper: true,
      };
    }
  }

  throw new Error("Unable to find approval slot");
};

// Generates approval solidity storage slot data
const calculateApprovalSolidityStorageSlot = (ownerAddress: Address, spenderAddress: Address, slotNumber: number) => {

  // Calculate the slot hash, using the owner address and the slot index
  const slotHash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [ownerAddress, BigInt(slotNumber)]
    )
  );
  // Calculate the storage slot, using the spender address and the slot hash
  const storageSlot = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "bytes32" }],
      [spenderAddress, slotHash]
    )
  );
  return { storageSlot, slotHash }
}

// Generates approval vyper storage slot data
const calculateApprovalVyperStorageSlot = (ownerAddress: Address, spenderAddress: Address, slotNumber: number) => {
  // create via vyper storage layout, which uses keccak256(abi.encode(slot, address(this))) instead of keccak256(abi.encode(address(this), slot))
  const vyperSlotHash = keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }],
      [BigInt(slotNumber), ownerAddress]
    )
  );

  const vyperStorageSlot = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "address" }],
      [vyperSlotHash, spenderAddress]
    )
  );

  return { vyperStorageSlot, vyperSlotHash }
}
/**
 * Get the approval for a given ERC20 token
 * @param client - The viem PublicClient instance
 * @param address - The address of the ERC20 token
 * @param ownerAddress - The address of the owner
 * @param spenderAddress - The address of the spender
 * @returns The approval amount
 */
export const getErc20Approval = async (
  client: ViemPublicClient,
  address: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> => {
  const approval = await client.readContract({
    address,
    abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress]
  });
  return approval;
};