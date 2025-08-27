import { 
  type Address, 
  type PublicClient, 
  type Hex,
  encodeAbiParameters,
  keccak256,
  parseAbiItem
} from "viem";
import type { ViemPublicClient } from "./types";


/**
 * Compute the storage slot for permit2 allowance. 
 *  NOTE: unlike arbitrary erc20 contracts, we know the slot for where this is stored (1) :)
 *
 * @param erc20Address - The address of the ERC20 token
 * @param ownerAddress - The address of the ERC20 token owner
 * @param spenderAddress - The address of the spender
 * @returns The slot where the allowance amount is stored, mock this 
 *
 * - This uses a brute force approach similar to the balance slot search. See the balance slot search comment for more details.
 */
export const computePermit2AllowanceStorageSlot = (ownerAddress: Address, erc20Address: Address, spenderAddress: Address): {
  slot: Hex;
} => {

  // Calculate the slot hash, using the owner address and the slot index (1)
  const ownerSlotHash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [ownerAddress, 1n]
    )
  );

  // Calcualte the storage slot hash for spender slot
  const tokenSlotHash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "bytes32" }],
      [erc20Address, ownerSlotHash]
    )
  );
  // Calculate the final storage slot to mock, using the spender address and the slot hash2
  const slot = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "bytes32" }],
      [spenderAddress, tokenSlotHash]
    )
  );
  return { slot }
}


/**
 * Get the permit2 erc20 allowance for a given ERC20 token and spender
 * @param client - The viem PublicClient instance
 * @param permit2Address - The permit2 contract address
 * @param erc20Address - The address of the ERC20 token
 * @param ownerAddress - The address of the ERC20 token owner
 * @param spenderAddress - The address of the spender
 * @returns The approval amount
 */
export const getPermit2ERC20Allowance = async (
  client: ViemPublicClient,
  permit2Address: Address,
  ownerAddress: Address, 
  erc20Address: Address, 
  spenderAddress: Address
): Promise<bigint> => {
  const approval = await client.readContract({
    address: permit2Address,
    abi: [parseAbiItem('function allowance(address owner, address token, address spender) view returns (uint256)')],
    functionName: 'allowance',
    args: [ownerAddress, erc20Address, spenderAddress]
  });
  return approval;
};