# @version ^0.3.10

# ERC20 Event definitions
event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256

event Approval:
    owner: indexed(address)
    spender: indexed(address)
    value: uint256

# ERC20 Public Variables for compatibility
name: public(String[64])
symbol: public(String[32])
decimals: public(uint8)
totalSupply: public(uint256)
balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])

# Access Control Owner (Teacher)
owner: public(address)

@external
def __init__():
    self.name = "Classroom Experience"
    self.symbol = "XP"
    self.decimals = 18
    self.owner = msg.sender
    self.totalSupply = 0

@external
def transfer(to: address, amount: uint256) -> bool:
    raise "SBT: Transfer disabled"

@external
def transferFrom(sender: address, receiver: address, amount: uint256) -> bool:
    raise "SBT: Transfer disabled"

@external
def approve(spender: address, amount: uint256) -> bool:
    raise "SBT: Approval disabled"

@external
def mint(to: address, amount: uint256) -> bool:
    assert msg.sender == self.owner, "Only owner (Teacher) can mint XP"
    assert to != empty(address), "SBT: mint to the zero address"
    self.totalSupply += amount
    self.balanceOf[to] += amount
    log Transfer(empty(address), to, amount)
    return True

@external
def burn(from_address: address, amount: uint256) -> bool:
    assert msg.sender == self.owner, "Only owner (Teacher) can burn XP"
    assert self.balanceOf[from_address] >= amount, "SBT: burn amount exceeds balance"
    self.totalSupply -= amount
    self.balanceOf[from_address] -= amount
    log Transfer(from_address, empty(address), amount)
    return True
