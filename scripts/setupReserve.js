/*
    fork test script that sets up the reserve on mainnet for the governance pools.
    Configure a reserve for some of the gov pools, then reward all of them. 
    Ensure default is respected and custom reserve works.
**/

// To use: in another terminal window run `yarn start-fork`. Open a second window and run `yarn fork-run ./scripts/setupReserve.js`

// 1. after fork, deploy ConfigurableReserve, from any signer.
// 2. set default rate
// 3. add the governace pools (dai, usdc, uni etc.)
// 4. transfer ownership of the configurable reserve to the timelock
// 5. set custom rate for one or two of the pools (done in step 3)
// 6. fast forward and capture reserve by calling startAward() and completeAward()
// 7. call withdrawReserve on both default and custom rate prize pools
// 8. calculate if correct reserve rate has been extracted

const chalk = require('chalk');
const hardhat = require('hardhat')
const { increaseTime } = require('./helpers/increaseTime')

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

async function runForkScript(){
    const { getNamedAccounts, deployments, ethers } = hardhat
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    dim(`Deployer is ${deployer}`)
    const configurableReserveResult = await deploy(`ConfigurableReserve`, {
        contract: 'ConfigurableReserve',
        args: [],
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    green(`Deployed Configurable Reserve at:  ${configurableReserveResult.address}`)

    const configurableReserve = await ethers.getContract("ConfigurableReserve", deployer)

   // set global default reserve rate
    await configurableReserve.setDefaultReserveRateMantissa(ethers.utils.parseEther("0.05"))

    // add prize pools to cofigurable reserve
    const daiPrizePool = "0xEBfb47A7ad0FD6e57323C8A42B2E5A6a4F68fc1a"
    const usdcPrizePool = "0xde9ec95d7708b8319ccca4b8bc92c0a3b70bf416"
    const uniPrizePool = "0x0650d780292142835F6ac58dd8E2a336e87b4393"

    dim(`setting reserve rates`)
    const setReserveRatesResult = await configurableReserve.setReserveRateMantissa(
        [daiPrizePool, usdcPrizePool,uniPrizePool],
        [ethers.utils.parseEther("0.10"), ethers.utils.parseEther("0.12"), ethers.utils.parseEther("0.15")],
        [false, true, true]
    )
    green(`reserve rates set for prize pools`)

    dim(`transferring ownership of configurable reserve to timelock`)
    await configurableReserve.transferOwnership("0x42cd8312D2BCe04277dD5161832460e95b24262E")
    green(`Timelock now owns ConfigurableReserve`)

    // startAndComplete Award
    const compoundPrizePoolAbi = require("../node_modules/@pooltogether/pooltogether-contracts/abis/CompoundPrizePool.json")
    const prizePool = await ethers.getContractAt(compoundPrizePoolAbi, daiPrizePool)

    // IMPERSONATE TIMELOCK
    await ethers.provider.send("hardhat_impersonateAccount", ["0x42cd8312D2BCe04277dD5161832460e95b24262E"])
    const timelockSigner = ethers.provider.getUncheckedSigner("0x42cd8312D2BCe04277dD5161832460e95b24262E")
  
    const periodicPrizeStrategy = require("../node_modules/@pooltogether/pooltogether-contracts/abis/PeriodicPrizeStrategy.json")
    const prizeStrategy = await ethers.getContractAt(periodicPrizeStrategy, await prizePool.prizeStrategy(), timelockSigner)

    //fund timelock with Ether
    await ethers.provider.send("hardhat_impersonateAccount", ["0x564286362092D8e7936f0549571a803B203aAceD"])
    const binance = await ethers.provider.getUncheckedSigner('0x564286362092D8e7936f0549571a803B203aAceD')
    await binance.sendTransaction({ to: "0x42cd8312D2BCe04277dD5161832460e95b24262E", value: ethers.utils.parseEther('1000') })

    dim(`now setting rng`)
    if(await prizeStrategy.rng() != '0xb1D89477d1b505C261bab6e73f08fA834544CD21') {
      dim(`Swapping RNG with blockhash on ${prizeStrategy.address}...`)
      await prizeStrategy.setRngService('0xb1D89477d1b505C261bab6e73f08fA834544CD21')     // msg.sender needs to be the timelock
    }
    //update reserve registry to point at ConfigurableReserve
    const reserveRegistryAbi = require("../node_modules/@pooltogether/pooltogether-contracts/abis/Registry.json")
    const reserveRegistryAddress = await prizePool.reserveRegistry()
    const reserveRegistryContract = await ethers.getContractAt(reserveRegistryAbi, reserveRegistryAddress, timelockSigner)
    await reserveRegistryContract.register(configurableReserve.address)
    green(`ReserveRegistry now pointing at ${configurableReserve.address}`)

    const remainingTime = await prizeStrategy.prizePeriodRemainingSeconds()
    dim(`Increasing time by ${remainingTime} seconds...`)
    await increaseTime(remainingTime.toNumber())
  
    let daiReserveFee
    let usdcReserveFee
    // if we cannot complete, let's start it
    if (await prizeStrategy.canStartAward()) {
      dim(`Starting award...`)
      await prizeStrategy.startAward()
      await increaseTime(1)
      await increaseTime(1)
    }
  
    if (await prizeStrategy.canCompleteAward()) {
      dim(`Completing award (will probably fail the first time on a fresh fork)....`)
      const completeAwardTx = await prizeStrategy.completeAward()
      const completeAwardReceipt = await ethers.provider.getTransactionReceipt(completeAwardTx.hash)
      const completeAwardEvents = completeAwardReceipt.logs.reduce((array, log) =>
      { try { array.push(prizePool.interface.parseLog(log)) } catch (e) {} return array }, [])
      const daiReserveFeeEvent = completeAwardEvents.filter(event => event.name === 'ReserveFeeCaptured')

      daiReserveFee = (daiReserveFeeEvent[0].args.amount).toString()
      console.log("the dai reserve fee was ", daiReserveFee)
    }

    // now call withdraw reserve on timelock and burn reserve!
    dim(`calling withdrawReserve on daiPrizePool`)
    const daiPrizePoolWithdrawReserve = await configurableReserve.connect(timelockSigner).withdrawReserve(daiPrizePool, "0x0650d780292142835F6ac58dd8E2a336e87b4393")
    const daiPrizePoolWithdrawReserveReceipt = await ethers.provider.getTransactionReceipt(daiPrizePoolWithdrawReserve.hash)
    const completeDaiAwardEvents = daiPrizePoolWithdrawReserveReceipt.logs.reduce((array, log) =>
        { try { array.push(prizePool.interface.parseLog(log)) } catch (e) {} return array }, [])

    const reserveDaiWithdrawnEvent = completeDaiAwardEvents.filter(event => event.name === 'ReserveWithdrawal')
    const daiPrizePoolWithdrawReserveAmount =  (reserveDaiWithdrawnEvent[0].args.amount).toString()
    console.log("DAI reserveWithdrawn event: ",daiPrizePoolWithdrawReserveAmount)
    
    // parse events and check default reserve rate is used
    dim(`calling withdrawReserve on usdc`)
    const usdcPrizePoolWithdrawReserve = await configurableReserve.connect(timelockSigner).withdrawReserve(usdcPrizePool, "0x0650d780292142835F6ac58dd8E2a336e87b4393")
    const usdcPrizePoolWithdrawReserveReceipt = await ethers.provider.getTransactionReceipt(usdcPrizePoolWithdrawReserve.hash)
    const completeAwardEvents = usdcPrizePoolWithdrawReserveReceipt.logs.reduce((array, log) =>
        { try { array.push(prizePool.interface.parseLog(log)) } catch (e) {} return array }, [])
    
    const reserveUsdcWithdrawnEvent = completeAwardEvents.filter(event => event.name === 'ReserveWithdrawal')
    const usdcWithdrawReserveAmount = (reserveUsdcWithdrawnEvent[0].args.amount).toString()
    console.log("USDC reserveWithdrawn event amount: ", usdcWithdrawReserveAmount)

}
runForkScript()