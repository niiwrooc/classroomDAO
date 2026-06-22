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

# ERC20 Public Variables
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
    self.name = "Student Gold Coin"
    self.symbol = "SGC"
    self.decimals = 18
    self.owner = msg.sender
    
    # Mint initial 100,000 SGC to the owner/teacher
    initial_supply: uint256 = 100000 * 10**18
    self.balanceOf[msg.sender] = initial_supply
    self.totalSupply = initial_supply
    log Transfer(empty(address), msg.sender, initial_supply)

@external
def transfer(to: address, amount: uint256) -> bool:
    assert to != empty(address), "ERC20: transfer to the zero address"
    assert self.balanceOf[msg.sender] >= amount, "ERC20: transfer amount exceeds balance"
    self.balanceOf[msg.sender] -= amount
    self.balanceOf[to] += amount
    log Transfer(msg.sender, to, amount)
    return True

@external
def transferFrom(sender: address, receiver: address, amount: uint256) -> bool:
    assert sender != empty(address), "ERC20: transfer from the zero address"
    assert receiver != empty(address), "ERC20: transfer to the zero address"
    assert self.balanceOf[sender] >= amount, "ERC20: transfer amount exceeds balance"
    assert self.allowance[sender][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance"
    
    self.allowance[sender][msg.sender] -= amount
    self.balanceOf[sender] -= amount
    self.balanceOf[receiver] += amount
    log Transfer(sender, receiver, amount)
    return True

@external
def approve(spender: address, amount: uint256) -> bool:
    assert spender != empty(address), "ERC20: approve to the zero address"
    self.allowance[msg.sender][spender] = amount
    log Approval(msg.sender, spender, amount)
    return True

@external
def mint(to: address, amount: uint256) -> bool:
    assert msg.sender == self.owner, "Only owner (Teacher) can mint"
    assert to != empty(address), "ERC20: mint to the zero address"
    self.totalSupply += amount
    self.balanceOf[to] += amount
    log Transfer(empty(address), to, amount)
    return True

@external
def burn(amount: uint256) -> bool:
    assert self.balanceOf[msg.sender] >= amount, "ERC20: burn amount exceeds balance"
    self.totalSupply -= amount
    self.balanceOf[msg.sender] -= amount
    log Transfer(msg.sender, empty(address), amount)
    return True

@external
def burnFrom(owner: address, amount: uint256) -> bool:
    assert self.balanceOf[owner] >= amount, "ERC20: burn amount exceeds balance"
    assert self.allowance[owner][msg.sender] >= amount, "ERC20: burn amount exceeds allowance"
    self.allowance[owner][msg.sender] -= amount
    self.totalSupply -= amount
    self.balanceOf[owner] -= amount
    log Transfer(owner, empty(address), amount)
    return True
