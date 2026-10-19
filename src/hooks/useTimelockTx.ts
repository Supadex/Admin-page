import { useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useReadContract } from 'wagmi';
import { encodeFunctionData, keccak256, toBytes, zeroHash, type Abi, type Address, type Hex } from 'viem';
import { getAddressesForChain } from '../contracts/addresses';
import { SupaTimelockABI } from '../contracts/abis';

function nextSalt(): Hex {
  return keccak256(toBytes(`supadex-tl-${Date.now()}-${Math.random()}`));
}

/**
 * Schedule (and on Anvil immediately warp+execute) a Timelock-owned call.
 */
export function useTimelockTx() {
  const { chain } = useAccount();
  const publicClient = usePublicClient();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { writeContractAsync } = useWriteContract();

  const { data: minDelay } = useReadContract({
    address: addrs?.timelock,
    abi: SupaTimelockABI,
    functionName: 'minDelay',
    query: { enabled: !!addrs?.timelock },
  });

  const scheduleAndMaybeExecute = useCallback(
    async (args: { target: Address; abi: Abi; functionName: string; args?: readonly unknown[] }) => {
      if (!addrs?.timelock) throw new Error('Timelock not deployed');
      const callData = encodeFunctionData({
        abi: args.abi,
        functionName: args.functionName,
        args: args.args as never,
      });
      const predecessor = zeroHash;
      const salt = nextSalt();
      const delay = (minDelay as bigint | undefined) ?? 86400n;

      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'schedule',
        args: [args.target, 0n, callData, predecessor, salt, delay],
      });

      // Anvil: warp past minDelay and execute immediately for local ops.
      if ((chain?.id ?? 31337) === 31337 && publicClient) {
        await publicClient.request({
          method: 'evm_increaseTime',
          params: [Number(delay) + 1],
        } as never);
        await publicClient.request({ method: 'evm_mine', params: [] } as never);
        await writeContractAsync({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'execute',
          args: [args.target, 0n, callData, predecessor, salt],
        });
      }

      return { callData, salt, delay };
    },
    [addrs?.timelock, minDelay, writeContractAsync, publicClient, chain?.id]
  );

  return { scheduleAndMaybeExecute, minDelay: minDelay as bigint | undefined, timelock: addrs?.timelock };
}
