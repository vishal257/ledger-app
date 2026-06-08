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
