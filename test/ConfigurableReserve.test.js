const { expect } = require("chai");
const hardhat = require('hardhat')

const { deployMockContract } = require('ethereum-waffle')
const { AddressZero, One } = require("ethers").constants

const overrides = { gasLimit: 9500000 }

const SENTINEL = '0x0000000000000000000000000000000000000001'

const debug = require('debug')('ptv3:Reserve.test')

describe('Reserve', () => {

    let wallet, wallet2

    let provider
    let reserve
    let prizePool

    before(async () => {
        [wallet, wallet2] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        const configurableReserve =  await hre.ethers.getContractFactory("ConfigurableReserve", wallet, overrides)


        reserve = await configurableReserve.deploy()

        

    })

    describe("add reserveRate for address",()=>{
        it("can set reserve rate" ,async ()=>{
            await expect(reserve.setReserveRateMantissa([SENTINEL],[10])).to.emit(reserve, "ReserveRateMantissaSet").withArgs(SENTINEL,"10")
        })

        it("gets correct reserveRateMantissa" ,async ()=>{
            expect(await reserve.reserveRateMantissa(SENTINEL)).to.equal("10")
        })

        it("should only be callable by owner" ,async ()=>{
            await expect(reserve.connect(wallet2).setReserveRateMantissa([AddressZero],[10])).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })
})