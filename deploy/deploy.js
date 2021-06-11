const chalk = require('chalk');
const { getChainId } = require('hardhat');

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

module.exports = async (hardhat) => {
  const { getNamedAccounts, deployments, ethers } = hardhat
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log("deployer is ", deployer)

  // constants 
  const configurableReserve = await deploy(`ConfigurableReserve`, {
    contract: 'ConfigurableReserve',
    args: [],
    from: deployer,
    skipIfAlreadyDeployed: true
  })
  green(`Deployed Configurable Reserve at:  ${configurableReserve.address}`)
    
  green(`Done!`)
};
