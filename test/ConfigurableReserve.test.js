const { expect } = require("chai");
const { deployMockContract } = require("ethereum-waffle");
const hardhat = require('hardhat');
const { AddressZero } = require("ethers").constants

const overrides = { gasLimit: 9500000 }

const SENTINEL = '0x0000000000000000000000000000000000000001'

describe('Configurable Reserve', () => {

    let wallet, wallet2
    let provider
    let reserve


    before(async () => {
        [wallet, wallet2] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        const configurableReserve =  await hre.ethers.getContractFactory("ConfigurableReserve", wallet, overrides)

        reserve = await configurableReserve.deploy()
    })

    describe("add reserveRate for address",()=>{
        it("can set reserve rate", async ()=>{
            await expect(reserve.setReserveRateMantissa([SENTINEL],["10"],[true])).to.emit(reserve, "ReserveRateMantissaSet").withArgs(SENTINEL,"10", true)
        })

        it("gets correct reserveRateMantissa", async ()=>{
            expect(await reserve.reserveRateMantissa(SENTINEL)).to.equal("10")
        })

        it("should only be callable by owner", async ()=>{
            await expect(reserve.connect(wallet2).setReserveRateMantissa([AddressZero],[10],[false])).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })

    describe("change the withdraw strategy address", ()=>{
        it("allows the strategy to be changed by the owner ", async ()=>{
            await expect(reserve.setWithdrawStrategist(AddressZero)).to.emit(reserve, "ReserveWithdrawStrategistChanged").withArgs(AddressZero)
        })
        it("retrieve the correct strategy", async () => {
            expect(await reserve.withdrawStrategist()).to.equal(AddressZero)
        })
        it("should only be callable by owner", async () => {
            await expect(reserve.connect(wallet2).setWithdrawStrategist(AddressZero)).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })

    describe("set the default reserve rate mantissa", ()=>{
        it("allows the strategy to be changed by the owner ", async ()=>{
            await expect(reserve.setDefaultReserveRateMantissa("15")).to.emit(reserve, "DefaultReserveRateMantissaSet").withArgs("15")
        })
        it("does not allow non-owner to set the default rate" ,async () => {
            await expect(reserve.connect(wallet2).setDefaultReserveRateMantissa("44")).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("returns the default rate" ,async () => {
            await reserve.setDefaultReserveRateMantissa("900")
            await expect(reserve.setReserveRateMantissa([SENTINEL],[0],[false])).to.emit(reserve, "ReserveRateMantissaSet").withArgs(SENTINEL, 0, false)
            expect(await reserve.reserveRateMantissa(SENTINEL)).to.equal("900")
        })  
    })

    describe("withdrawReserve", ()=>{
        let prizePoolInterface
        let prizePool

        beforeEach(async()=>{
            prizePoolInterface = await hre.artifacts.readArtifact("PrizePoolInterface")
            prizePool = await deployMockContract(wallet, prizePoolInterface.abi)
        })

        it("allows withdraw reserve to be called on a prize pool", async ()=>{
            await prizePool.mock.withdrawReserve.revertsWithReason(20)
            await expect(reserve.withdrawReserve(prizePool.address, AddressZero)).to.be.reverted
        })
        it("does not allow non-owner to call" ,async () => {
            await expect(reserve.connect(wallet2).withdrawReserve(prizePool.address, AddressZero)).
            to.be.revertedWith("!onlyOwnerOrWithdrawStrategist")
        })
    })

})