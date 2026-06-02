import re

def is_valid_cpf(cpf: str) -> bool:
    """
    Valida um CPF brasileiro através do cálculo dos dígitos verificadores.
    """
    # Remover caracteres não numéricos
    cpf_clean = re.sub(r'[^0-9]', '', cpf)
    
    # Verificar tamanho
    if len(cpf_clean) != 11:
        return False
        
    # Verificar CPFs com todos os números iguais (ex: 111.111.111-11)
    if len(set(cpf_clean)) == 1:
        return False
        
    # Calcular o primeiro dígito verificador
    sum_val = 0
    for i in range(9):
        sum_val += int(cpf_clean[i]) * (10 - i)
    rem = sum_val % 11
    digit1 = 0 if rem < 2 else 11 - rem
    
    if int(cpf_clean[9]) != digit1:
        return False
        
    # Calcular o segundo dígito verificador
    sum_val = 0
    for i in range(10):
        sum_val += int(cpf_clean[i]) * (11 - i)
    rem = sum_val % 11
    digit2 = 0 if rem < 2 else 11 - rem
    
    if int(cpf_clean[10]) != digit2:
        return False
        
    return True
