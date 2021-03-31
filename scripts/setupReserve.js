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
    const defaultReserveRate = ethers.utils.parseEther("0.05")
    await configurableReserve.setDefaultReserveRateMantissa(defaultReserveRate)

    // add prize pools to cofigurable reserve
    const daiPrizePoolAddress = "0xEBfb47A7ad0FD6e57323C8A42B2E5A6a4F68fc1a"
    const usdcPrizePoolAddress = "0xde9ec95d7708b8319ccca4b8bc92c0a3b70bf416"
    const uniPrizePool = "0x0650d780292142835F6ac58dd8E2a336e87b4393"

    const usdcReserveRate = ethers.utils.parseEther("0.12")

    dim(`setting reserve rates`)
    const setReserveRatesResult = await configurableReserve.setReserveRateMantissa(
        [daiPrizePoolAddress, usdcPrizePoolAddress,uniPrizePool],
        [ethers.utils.parseEther("0.10"), usdcReserveRate, ethers.utils.parseEther("0.15")],
        [false, true, true]
    )
    green(`reserve rates set for prize pools`)

    dim(`transferring ownership of configurable reserve to timelock`)
    await configurableReserve.transferOwnership("0x42cd8312D2BCe04277dD5161832460e95b24262E")
    green(`Timelock now owns ConfigurableReserve`)

    // startAndComplete Award
    const compoundPrizePoolAbi = require("../node_modules/@pooltogether/pooltogether-contracts/abis/CompoundPrizePool.json")
    const daiPrizePool = await ethers.getContractAt(compoundPrizePoolAbi, daiPrizePoolAddress)
    const usdcPrizePool = await ethers.getContractAt(compoundPrizePoolAbi, usdcPrizePoolAddress)

    // IMPERSONATE TIMELOCK
    await ethers.provider.send("hardhat_impersonateAccount", ["0x42cd8312D2BCe04277dD5161832460e95b24262E"])
    const timelockSigner = ethers.provider.getUncheckedSigner("0x42cd8312D2BCe04277dD5161832460e95b24262E")
  
    const periodicPrizeStrategy = require("../node_modules/@pooltogether/pooltogether-contracts/abis/PeriodicPrizeStrategy.json")
    const daiPrizeStrategy = await ethers.getContractAt(periodicPrizeStrategy, await daiPrizePool.prizeStrategy(), timelockSigner)
    const usdcPrizeStrategy = await ethers.getContractAt(periodicPrizeStrategy, await usdcPrizePool.prizeStrategy(), timelockSigner)

    //fund timelock with Ether
    await ethers.provider.send("hardhat_impersonateAccount", ["0x564286362092D8e7936f0549571a803B203aAceD"])
    const binance = await ethers.provider.getUncheckedSigner('0x564286362092D8e7936f0549571a803B203aAceD')
    await binance.sendTransaction({ to: "0x42cd8312D2BCe04277dD5161832460e95b24262E", value: ethers.utils.parseEther('1000') })

    dim(`now setting rng for dai strategy`)
    if(await daiPrizeStrategy.rng() != '0xb1D89477d1b505C261bab6e73f08fA834544CD21') {
      dim(`Swapping RNG with blockhash on ${daiPrizeStrategy.address}...`)
      await daiPrizeStrategy.setRngService('0xb1D89477d1b505C261bab6e73f08fA834544CD21')     // msg.sender needs to be the timelock
    }
    dim(`now setting rng for usdc strategy`)
    if(await usdcPrizeStrategy.rng() != '0xb1D89477d1b505C261bab6e73f08fA834544CD21') {
      dim(`Swapping RNG with blockhash on ${usdcPrizeStrategy.address}...`)
      await usdcPrizeStrategy.setRngService('0xb1D89477d1b505C261bab6e73f08fA834544CD21')     // msg.sender needs to be the timelock
    }
    //update reserve registry to point at ConfigurableReserve
    const reserveRegistryAbi = require("../node_modules/@pooltogether/pooltogether-contracts/abis/Registry.json")
    const reserveRegistryAddress = await daiPrizePool.reserveRegistry()
    const reserveRegistryContract = await ethers.getContractAt(reserveRegistryAbi, reserveRegistryAddress, timelockSigner)
    await reserveRegistryContract.register(configurableReserve.address)
    green(`ReserveRegistry now pointing at ${configurableReserve.address}`)

    const remainingTime = await daiPrizeStrategy.prizePeriodRemainingSeconds()
    dim(`Increasing time by ${remainingTime} seconds...`)
    await increaseTime(remainingTime.toNumber())
  
    let daiReserveFee
    let daiCaptured 
    // if we cannot complete, let's start it
    if (await daiPrizeStrategy.canStartAward()) {
      dim(`Starting DAI award...`)
      await daiPrizeStrategy.startAward()
      await increaseTime(1)
      await increaseTime(1)
    }
  
    if (await daiPrizeStrategy.canCompleteAward()) {
      dim(`Completing award (will probably fail the first time on a fresh fork)....`)
      const completeAwardTx = await daiPrizeStrategy.completeAward()
      const completeAwardReceipt = await ethers.provider.getTransactionReceipt(completeAwardTx.hash)
      const completeAwardEvents = completeAwardReceipt.logs.reduce((array, log) =>
      { try { array.push(daiPrizePool.interface.parseLog(log)) } catch (e) {} return array }, [])
      const daiReserveFeeEvent = completeAwardEvents.filter(event => event.name === 'ReserveFeeCaptured')
      // console.log("completeAwardEvents ", completeAwardEvents)

      const daiAwardCapturedEvent = completeAwardEvents.filter(event => event.name === 'AwardCaptured')
      daiCaptured = daiAwardCapturedEvent[0].args.amount
      daiReserveFee = daiReserveFeeEvent[0].args.amount
    }

    // calculating reserve rate mantissa
    // effective reserve mantissa = withdrawn reserve fee *1e18 / ( award captured + reserve fee) === configured resreve for prize pool
    const daiCalculatedReserveRateMantissa = (daiReserveFee.mul(ethers.utils.parseEther("1"))).div((daiCaptured.add(daiReserveFee)))
    console.log("dai reserve rate mantissa calculated as ", daiCalculatedReserveRateMantissa.toString())
    console.log("default reserve rate was ", defaultReserveRate.toString())
    
    green(`DAI POOL CHECK COMPLETE`)

    let usdcReserveFee
    let usdcCaptured

    // now award for usdc 
    if (await usdcPrizeStrategy.canStartAward()) {
      dim(`Starting USDC award...`)
      await usdcPrizeStrategy.startAward()
      await increaseTime(1)
      await increaseTime(1)
    }
  
    if (await usdcPrizeStrategy.canCompleteAward()) {
      dim(`Completing award (will probably fail the first time on a fresh fork)....`)
      const completeAwardTx = await usdcPrizeStrategy.completeAward()
      const completeAwardReceipt = await ethers.provider.getTransactionReceipt(completeAwardTx.hash)
      const completeAwardEvents = completeAwardReceipt.logs.reduce((array, log) =>
      { try { array.push(usdcPrizePool.interface.parseLog(log)) } catch (e) {} return array }, [])
      const usdcReserveFeeEvent = completeAwardEvents.filter(event => event.name === 'ReserveFeeCaptured')
      const usdcAwardCapturedEvent = completeAwardEvents.filter(event => event.name === 'AwardCaptured')
      usdcCaptured = usdcAwardCapturedEvent[0].args.amount
      usdcReserveFee = usdcReserveFeeEvent[0].args.amount
      dim(`usdc award completed`)
    }

    // calculating reserve rate mantissa
    // effective reserve mantissa = withdrawn reserve fee *1e18 / ( award captured + reserve fee) === configured resreve for prize pool
    const usdcCalculatedReserveRateMantissa = (usdcReserveFee.mul(ethers.utils.parseEther("1"))).div((usdcCaptured.add(usdcReserveFee)))
    console.log("usdc reserve rate mantissa calculated as ", usdcCalculatedReserveRateMantissa.toString())
    console.log("usdc reserve rate was set to", usdcReserveRate.toString())
    green(`USDC POOL CHECK COMPLETE`)

}
runForkScript()