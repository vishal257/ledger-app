import os
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, flash, request, make_response, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from xhtml2pdf import pisa
from io import BytesIO

from models import db, User, Invoice, InvoiceItem

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///ledger.db')
if app.config['SQLALCHEMY_DATABASE_URI'].startswith("postgres://"):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    from sqlalchemy import text
    columns = [
        'company_name VARCHAR(200)',
        'company_address VARCHAR(500)',
        'company_email VARCHAR(150)',
        'company_phone VARCHAR(50)',
        'payment_instructions TEXT',
        'invoice_notes TEXT'
    ]
    for col in columns:
        try:
            db.session.execute(text(f'ALTER TABLE user ADD COLUMN {col}'))
            db.session.commit()
        except Exception:
            db.session.rollback()

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        if username:
            username = username.strip().title()
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        if username:
            username = username.strip().title()
        password = request.form.get('password')
        
        company_name = request.form.get('company_name', 'J.M.D ENTERPRICES')
        company_address = request.form.get('company_address', 'NEAR PETROL PUMP, BHIKOWAL, DISTT.HOSHIARPUR')
        company_email = request.form.get('company_email', 'Satyamsh20111@gmail.com')
        company_phone = request.form.get('company_phone', '9592348990')
        payment_instructions = request.form.get('payment_instructions', 'Please make checks payable to J.M.D ENTERPRICES.')
        invoice_notes = request.form.get('invoice_notes', 'Thank you for your business!')
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists', 'error')
        else:
            new_user = User(
                username=username,
                password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
                company_name=company_name,
                company_address=company_address,
                company_email=company_email,
                company_phone=company_phone,
                payment_instructions=payment_instructions,
                invoice_notes=invoice_notes
            )
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user)
            return redirect(url_for('dashboard'))
            
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    if request.method == 'POST':
        current_user.company_name = request.form.get('company_name', '')
        current_user.company_address = request.form.get('company_address', '')
        current_user.company_email = request.form.get('company_email', '')
        current_user.company_phone = request.form.get('company_phone', '')
        current_user.payment_instructions = request.form.get('payment_instructions', '')
        current_user.invoice_notes = request.form.get('invoice_notes', '')
        db.session.commit()
        flash('Settings updated successfully', 'success')
        return redirect(url_for('settings'))
    return render_template('settings.html')

@app.route('/dashboard')
@login_required
def dashboard():
    invoices = Invoice.query.filter_by(user_id=current_user.id).order_by(Invoice.created_at.desc()).all()
    return render_template('dashboard.html', invoices=invoices)

@app.route('/api/dashboard/stats')
@login_required
def dashboard_stats():
    invoices = Invoice.query.filter_by(user_id=current_user.id).order_by(Invoice.invoice_date.asc()).all()
    
    revenue_over_time = []
    daily_stats = {}
    
    for inv in invoices:
        date_str = inv.invoice_date.strftime('%Y-%m-%d')
        if date_str not in daily_stats:
            daily_stats[date_str] = {"revenue": 0.0, "commission": 0.0, "count": 0}
        
        daily_stats[date_str]["revenue"] += inv.total
        daily_stats[date_str]["commission"] += inv.commission_amt
        daily_stats[date_str]["count"] += 1
        
    for date_str, stats in daily_stats.items():
        revenue_over_time.append({
            "date": date_str,
            "revenue": stats["revenue"],
            "commission": stats["commission"],
            "count": stats["count"]
        })
        
    revenue_over_time.sort(key=lambda x: x["date"])
    
    # Wood distribution
    wood_stats = {}
    for inv in invoices:
        for item in inv.items:
            cat = item.wood_category or "UNKNOWN"
            if cat not in wood_stats:
                wood_stats[cat] = {"weight": 0.0, "amount": 0.0}
            wood_stats[cat]["weight"] += item.gross_weight
            wood_stats[cat]["amount"] += item.amount
            
    return jsonify({
        "revenue_over_time": revenue_over_time,
        "wood_distribution": wood_stats
    })

@app.route('/invoice/new', methods=['GET', 'POST'])
@login_required
def new_invoice():
    if request.method == 'POST':
        # Retrieve form data
        client_name = request.form.get('client_name') or ""
        contact_name = request.form.get('contact_name') or ""
        address_1 = request.form.get('address_1') or ""
        address_2 = request.form.get('address_2') or ""
        address_3 = request.form.get('address_3') or ""
        invoice_no = request.form.get('invoice_no')
        invoice_date_str = request.form.get('invoice_date')
        due_date_str = request.form.get('due_date')
        po_no = request.form.get('po_no')
        
        subtotal = float(request.form.get('subtotal', 0.0))
        commission_pct = float(request.form.get('commission_pct', 0.0))
        commission_amt = float(request.form.get('commission_amt', 0.0))
        
        tax_enabled = request.form.get('tax_enabled') == 'on'
        tax_pct = float(request.form.get('tax_pct', 0.0))
        tax_amt = float(request.form.get('tax_amt', 0.0)) if tax_enabled else 0.0
        
        total = float(request.form.get('total', 0.0))
        
        invoice_date = datetime.strptime(invoice_date_str, '%Y-%m-%d').date() if invoice_date_str else datetime.utcnow().date()
        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else datetime.utcnow().date()
        
        # Create Invoice
        invoice = Invoice(
            user_id=current_user.id,
            client_name=client_name,
            contact_name=contact_name,
            address_1=address_1,
            address_2=address_2,
            address_3=address_3,
            invoice_no=invoice_no,
            invoice_date=invoice_date,
            due_date=due_date,
            po_no=po_no,
            subtotal=subtotal,
            commission_pct=commission_pct,
            commission_amt=commission_amt,
            tax_enabled=tax_enabled,
            tax_pct=tax_pct,
            tax_amt=tax_amt,
            total=total
        )
        
        db.session.add(invoice)
        db.session.flush() # To get the invoice id
        
        # Add items
        items = request.form.getlist('item_desc[]')
        wood_categories = request.form.getlist('wood_category[]')
        gross_weights = request.form.getlist('gross_weight[]')
        rates = request.form.getlist('rate[]')
        amounts = request.form.getlist('amount[]')
        
        for i in range(len(items)):
            if items[i].strip() == '':
                continue
            item = InvoiceItem(
                invoice_id=invoice.id,
                item_desc=items[i],
                wood_category=wood_categories[i] if i < len(wood_categories) else '',
                gross_weight=float(gross_weights[i]) if i < len(gross_weights) and gross_weights[i] else 0.0,
                rate=float(rates[i]) if i < len(rates) and rates[i] else 0.0,
                amount=float(amounts[i]) if i < len(amounts) and amounts[i] else 0.0
            )
            db.session.add(item)
            
        db.session.commit()
        return redirect(url_for('view_invoice', invoice_id=invoice.id))
        
    # Auto-generate next invoice number
    last_invoice = Invoice.query.filter_by(user_id=current_user.id).order_by(Invoice.id.desc()).first()
    next_invoice_no = "INV-0001"
    if last_invoice and last_invoice.invoice_no:
        import re
        match = re.search(r'(\d+)$', last_invoice.invoice_no)
        if match:
            num = int(match.group(1))
            width = len(match.group(1))
            next_invoice_no = last_invoice.invoice_no[:match.start()] + str(num + 1).zfill(width) + last_invoice.invoice_no[match.end():]
        else:
            next_invoice_no = last_invoice.invoice_no + "-1"
            
    import random
    import string
    random_po = f"PO-{''.join(random.choices(string.ascii_uppercase, k=2))}{''.join(random.choices(string.digits, k=4))}"
            
    return render_template('new_invoice.html', next_invoice_no=next_invoice_no, next_po_no=random_po)

@app.route('/invoice/<int:invoice_id>')
@login_required
def view_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    if invoice.user_id != current_user.id:
        return "Unauthorized", 403
    return render_template('invoice_preview.html', invoice=invoice)

@app.route('/invoice/<int:invoice_id>/pdf')
@login_required
def generate_pdf(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    if invoice.user_id != current_user.id:
        return "Unauthorized", 403
        
    rendered_html = render_template('invoice_template.html', invoice=invoice)
    
    # Generate PDF
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(
        rendered_html, dest=pdf_buffer
    )
    
    if pisa_status.err:
        return "Error rendering PDF", 500
        
    response = make_response(pdf_buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=Invoice_{invoice.invoice_no}.pdf'
    return response

@app.route('/invoice/<int:invoice_id>/delete', methods=['POST'])
@login_required
def delete_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    if invoice.user_id != current_user.id:
        return "Unauthorized", 403
        
    password = request.form.get('password')
    if not password or not check_password_hash(current_user.password_hash, password):
        flash('Incorrect password. Invoice deletion failed.', 'error')
        return redirect(url_for('dashboard'))
        
    for item in invoice.items:
        db.session.delete(item)
        
    db.session.delete(invoice)
    db.session.commit()
    flash(f'Invoice {invoice.invoice_no} deleted successfully.', 'success')
    return redirect(url_for('dashboard'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
