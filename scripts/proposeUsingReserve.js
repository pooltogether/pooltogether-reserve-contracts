const hardhat = require('hardhat')
const chalk = require("chalk")

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

const { ethers } = hardhat

const timelockAddress = '0x42cd8312D2BCe04277dD5161832460e95b24262E'

async function run() {
    const timelock = await ethers.provider.getUncheckedSigner(timelockAddress)
    await ethers.provider.send("hardhat_impersonateAccount", [timelockAddress])
    await ethers.provider.send("hardhat_impersonateAccount", ["0x564286362092D8e7936f0549571a803B203aAceD"])
    const binance = await ethers.provider.getUncheckedSigner('0x564286362092D8e7936f0549571a803B203aAceD')
    await binance.sendTransaction({ to: "0x42cd8312D2BCe04277dD5161832460e95b24262E", value: ethers.utils.parseEther('1000') })
    
    const ReserveRegistryAddress = "0x3e8b9901dBFE766d3FE44B36c180A1bca2B9A295"
    const reserveRegistryArtifact = require("../node_modules/@pooltogether/pooltogether-contracts/abis/Registry.json")

    const reserveRegistry = await ethers.getContractAt(reserveRegistryArtifact,  ReserveRegistryAddress, timelock)
    
    const configurableReserveAddress = "0xd1797D46C3E825fce5215a0259D3426a5c49455C"
    await reserveRegistry.register(configurableReserveAddress)

    green(`Reserve Registry now points to ${await reserveRegistry.lookup()}`)

    green(`Done!`)
}

run()