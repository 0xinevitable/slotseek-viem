import { getErc20ApprovalStorageSlot } from "../../../src";
import { createPublicClient, http, type Address } from "viem";
import { base, mainnet } from "viem/chains";

describe("getErc20ApprovalStorageSlot", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  it("should return the slot for the approval", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const maxSlots = 30;
    const { slot, slotHash, isVyper } = await getErc20ApprovalStorageSlot(
      baseClient,
      tokenAddress,
      ownerAddress,
      spenderAddress,
      maxSlots
    );
    expect(slot).toBeDefined();
    expect(slot).toBe("0x0a");
    expect(slotHash).toBeDefined();
    expect(slotHash).toBe(
      "0xf2dfc0227cd25ec2dc7c59717d57cc191c316c525cb2f0ea056315d3be9b1d39"
    );
    expect(isVyper).toBe(false);
  }, 120000);
  it("[vyper] should return the slot for the approval", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const maxSlots = 30;
    const { slot, slotHash, isVyper } = await getErc20ApprovalStorageSlot(
      ethClient,
      tokenAddress,
      ownerAddress,
      spenderAddress,
      maxSlots
    );
    expect(slot).toBeDefined();
    expect(slot).toBe("0x04");
    expect(slotHash).toBeDefined();
    expect(slotHash).toBe(
      "0xfdea71adb068939bcb1c6cec44c1a3b422cf39891d820933d2cc03eb8a72f14c"
    );
    expect(isVyper).toBe(true);
  }, 120000);
});
