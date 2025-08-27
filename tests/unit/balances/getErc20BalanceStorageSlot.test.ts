import { getErc20BalanceStorageSlot } from "../../../src";
import { createPublicClient, http, type Address } from "viem";
import { base, mainnet } from "viem/chains";

describe("getErc20BalanceStorageSlot", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  it("should return the slot and balance for the holder", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const holderAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const maxSlots = 30;
    const { slot, balance, isVyper } = await getErc20BalanceStorageSlot(
      baseClient,
      tokenAddress,
      holderAddress,
      maxSlots
    );
    expect(slot).toBeDefined();
    expect(balance).toBeDefined();
    expect(slot).toBe("0x09");
    expect(balance.toString()).toBe("8600000");
    expect(isVyper).toBe(false);
  }, 120000);

  it("[vyper] should return the slot and balance for the holder", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const holderAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const maxSlots = 30;
    const { slot, balance, isVyper } = await getErc20BalanceStorageSlot(
      ethClient,
      tokenAddress,
      holderAddress,
      maxSlots
    );
    expect(slot).toBeDefined();
    expect(balance).toBeDefined();
    expect(slot).toBe("0x03");
    expect(balance.toString()).toBe("45868293345383087538");
    expect(isVyper).toBe(true);
  }, 120000);
});
