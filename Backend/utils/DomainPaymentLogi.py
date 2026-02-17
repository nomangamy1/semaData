from models.domain import Domain 

def check_activation(self):
    if self.amount_paid >= self.total_budget *0.3:
        self.is_active = True
        self.payment_status = "patially paid"