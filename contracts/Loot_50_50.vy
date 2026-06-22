# @version ^0.3.10

# External Interfaces
interface ISGC:
    def transfer(to: address, amount: uint256) -> bool: external
    def transferFrom(sender: address, receiver: address, amount: uint256) -> bool: external
    def burn(amount: uint256) -> bool: external

interface IXP:
    def balanceOf(account: address) -> uint256: view

# Event declarations
event ItemAdded:
    item_id: indexed(uint256)
    price: uint256
    xp_required: uint256

event ItemPurchased:
    buyer: indexed(address)
    item_id: indexed(uint256)
    price: uint256
    burned: uint256
    recycled: uint256

event LootDistributed:
    guild_leader: indexed(address)
    total_amount: uint256
    vault_share: uint256
    members_count: uint256
    share_per_member: uint256

event VaultWithdrawal:
    leader: indexed(address)
    recipient: indexed(address)
    amount: uint256

# Structs
struct Item:
    price: uint256
    xp_required: uint256
    active: bool

# State Variables
sgc_token: public(address)
xp_token: public(address)
teacher: public(address)

# Leader -> Vault balance mapping
vault_balances: public(HashMap[address, uint256])

# Item ID -> Item mapping
items: public(HashMap[uint256, Item])

@external
def __init__(sgc: address, xp: address):
    assert sgc != empty(address), "Invalid SGC address"
    assert xp != empty(address), "Invalid XP address"
    self.sgc_token = sgc
    self.xp_token = xp
    self.teacher = msg.sender

@external
def add_item(item_id: uint256, price: uint256, xp_required: uint256):
    assert msg.sender == self.teacher, "Only teacher can add items"
    self.items[item_id] = Item({
        price: price,
        xp_required: xp_required,
        active: True
    })
    log ItemAdded(item_id, price, xp_required)

@external
def deactivate_item(item_id: uint256):
    assert msg.sender == self.teacher, "Only teacher can deactivate items"
    self.items[item_id].active = False

@external
def buy_item(item_id: uint256):
    item: Item = self.items[item_id]
    assert item.active, "Item is not active or does not exist"
    
    # Check if student has enough XP (Soulbound level limit)
    buyer_xp: uint256 = IXP(self.xp_token).balanceOf(msg.sender)
    assert buyer_xp >= item.xp_required, "Insufficient XP level"
    
    # Pull SGC payment from buyer
    assert ISGC(self.sgc_token).transferFrom(msg.sender, self, item.price), "SGC transfer failed"
    
    # 50/50 Deflationary Split:
    # 50% burned, 50% recirculated to Teacher (owner)
    burn_amount: uint256 = item.price / 2
    recycle_amount: uint256 = item.price - burn_amount
    
    assert ISGC(self.sgc_token).burn(burn_amount), "SGC burn failed"
    assert ISGC(self.sgc_token).transfer(self.teacher, recycle_amount), "SGC recirculation failed"
    
    log ItemPurchased(msg.sender, item_id, item.price, burn_amount, recycle_amount)

@external
def distribute_loot(guild_leader: address, members: DynArray[address, 100], amount: uint256):
    assert guild_leader != empty(address), "Invalid guild leader"
    assert amount > 0, "Amount must be greater than zero"
    
    # Pull SGC from caller (guild reward distributor, e.g. teacher or contract manager)
    assert ISGC(self.sgc_token).transferFrom(msg.sender, self, amount), "SGC transfer failed"
    
    # Split 50/50
    vault_share: uint256 = amount / 2
    members_share: uint256 = amount - vault_share
    
    # Deposit 50% to Leader's Vault
    self.vault_balances[guild_leader] += vault_share
    
    # Distribute 50% directly to members
    num_members: uint256 = len(members)
    share_per_member: uint256 = 0
    
    if num_members > 0:
        share_per_member = members_share / num_members
        remainder: uint256 = members_share % num_members
        
        for member in members:
            assert ISGC(self.sgc_token).transfer(member, share_per_member), "Member payout failed"
            
        # Add division remainder to Leader's vault
        if remainder > 0:
            self.vault_balances[guild_leader] += remainder
    else:
        # If no members, the leader's vault receives the full amount
        self.vault_balances[guild_leader] += members_share
        
    log LootDistributed(guild_leader, amount, vault_share, num_members, share_per_member)

@external
def withdraw_from_vault(amount: uint256, recipient: address):
    assert recipient != empty(address), "Invalid recipient"
    assert self.vault_balances[msg.sender] >= amount, "Insufficient vault balance"
    
    self.vault_balances[msg.sender] -= amount
    assert ISGC(self.sgc_token).transfer(recipient, amount), "Vault SGC transfer failed"
    
    log VaultWithdrawal(msg.sender, recipient, amount)
