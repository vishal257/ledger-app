from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Company Profile Details
    company_name = db.Column(db.String(200), nullable=True)
    company_address = db.Column(db.String(500), nullable=True)
    company_email = db.Column(db.String(150), nullable=True)
    company_phone = db.Column(db.String(50), nullable=True)
    payment_instructions = db.Column(db.Text, nullable=True)
    invoice_notes = db.Column(db.Text, nullable=True)

    invoices = db.relationship('Invoice', backref='user', lazy=True)

class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    client_name = db.Column(db.String(200), nullable=False)
    contact_name = db.Column(db.String(200), nullable=True)
    address_1 = db.Column(db.String(200), nullable=False)
    address_2 = db.Column(db.String(200), nullable=True)
    address_3 = db.Column(db.String(200), nullable=True)
    
    invoice_no = db.Column(db.String(100), nullable=False)
    invoice_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    po_no = db.Column(db.String(100), nullable=True)
    
    subtotal = db.Column(db.Float, nullable=False, default=0.0)
    commission_pct = db.Column(db.Float, nullable=False, default=0.0)
    commission_amt = db.Column(db.Float, nullable=False, default=0.0)
    
    tax_enabled = db.Column(db.Boolean, nullable=False, default=False)
    tax_pct = db.Column(db.Float, nullable=False, default=0.0)
    tax_amt = db.Column(db.Float, nullable=False, default=0.0)
    
    total = db.Column(db.Float, nullable=False, default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('InvoiceItem', backref='invoice', lazy=True, cascade="all, delete-orphan")
    additional_charges = db.relationship('AdditionalCharge', backref='invoice', lazy=True, cascade="all, delete-orphan")

class AdditionalCharge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    
    charge_name = db.Column(db.String(200), nullable=False)
    rate = db.Column(db.Float, nullable=False)

class InvoiceItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    
    item_desc = db.Column(db.String(200), nullable=False)
    wood_category = db.Column(db.String(200), nullable=True)
    gross_weight = db.Column(db.Float, nullable=False)
    rate = db.Column(db.Float, nullable=False)
    amount = db.Column(db.Float, nullable=False)


class LedgerAccount(db.Model):
    """Represents a ledger account for a party/company.
    Each page in the physical ledger book corresponds to one account."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    account_name = db.Column(db.String(200), nullable=False)  # Name / Company Name
    gst_no = db.Column(db.String(50), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    address = db.Column(db.String(500), nullable=True)
    
    # Opening balance when the account was created
    opening_balance = db.Column(db.Float, nullable=False, default=0.0)
    opening_balance_type = db.Column(db.String(2), nullable=False, default='Dr')  # 'Dr' or 'Cr'
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    entries = db.relationship('LedgerEntry', backref='account', lazy=True, 
                              cascade="all, delete-orphan", order_by='LedgerEntry.date.asc(), LedgerEntry.id.asc()')
    user = db.relationship('User', backref=db.backref('ledger_accounts', lazy=True))

    @property
    def current_balance(self):
        """Calculate the current balance from opening balance + all entries."""
        # Positive = Debit balance, Negative = Credit balance
        balance = self.opening_balance if self.opening_balance_type == 'Dr' else -self.opening_balance
        for entry in self.entries:
            balance += (entry.debit or 0.0) - (entry.credit or 0.0)
        return balance

    @property
    def current_balance_display(self):
        """Return (abs_amount, 'Dr'/'Cr'/'Settled') tuple for display."""
        bal = self.current_balance
        if abs(bal) < 0.001:
            return 0.0, 'Settled'
        elif bal > 0:
            return abs(bal), 'Dr'
        else:
            return abs(bal), 'Cr'

    @property
    def total_debit(self):
        return sum((e.debit or 0.0) for e in self.entries) + (self.opening_balance if self.opening_balance_type == 'Dr' else 0.0)

    @property
    def total_credit(self):
        return sum((e.credit or 0.0) for e in self.entries) + (self.opening_balance if self.opening_balance_type == 'Cr' else 0.0)


class LedgerEntry(db.Model):
    """A single row/entry in a ledger account - one debit or credit transaction."""
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('ledger_account.id'), nullable=False)
    
    date = db.Column(db.Date, nullable=False)
    particulars = db.Column(db.String(500), nullable=False)  # Description of the transaction
    folio = db.Column(db.String(50), nullable=True)  # Cross-reference / voucher number
    
    debit = db.Column(db.Float, nullable=True, default=0.0)   # Amount received / owed to us
    credit = db.Column(db.Float, nullable=True, default=0.0)  # Amount paid / we owe
    
    # Optional link to an invoice
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=True)
    invoice = db.relationship('Invoice', backref=db.backref('ledger_entries', lazy=True))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
