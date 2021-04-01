
const hardhat = require("hardhat")

async function setPrizePools(){
    const { getNamedAccounts, deployments, ethers } = hardhat
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log("deployer is ", deployer)
    const configurableReserve = await hardhat.ethers.getContractAt("ConfigurableReserve", "0xd1797D46C3E825fce5215a0259D3426a5c49455C", deployer)

    const setReserveMantissasResult = await configurableReserve.setReserveRateMantissa(["0xEBfb47A7ad0FD6e57323C8A42B2E5A6a4F68fc1a", "0x0650d780292142835F6ac58dd8E2a336e87b4393",  "0xde9ec95d7708b8319ccca4b8bc92c0a3b70bf416", "0xBC82221e131c082336cf698F0cA3EBd18aFd4ce7"],
    [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")],
    [true, true, true, true]
    )

    console.log(setReserveMantissasResult)

}
setPrizePools()