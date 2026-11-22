"""Synthetic reference fixtures only; never real cost data."""
import copy
import json
import pytest
from app.engines.finance.engine import FinanceEngine, CashInput, cashflow, irr
from app.api.schemas.contract import SimulationRequest
from tests.test_contract import client, H

PAYLOAD = {'mode':'cashflow','input':{'currency':'XOF','lifetimeYears':10,'realDiscountRatePct':0,
 'capexItems':[{'label':'Modules QA','amount':1000,'source':'Devis fictif QA','includedInOther':False}],
 'opexItems':[{'label':'Maintenance QA','amount':50,'source':'Contrat fictif QA','includedInOther':False}],
 'replacements':[],'yearOneProductionKwh':1000,'degradationPctPerYear':0,'soldShare':1,'substitutedShare':0,
 'saleTariffPerKwh':0.25,'referenceCostPerKwh':None,'subsidy':0,'residualValue':0},
 'evidence':{'reference':'Documents fictifs QA','date':'2026-11-20','costsConfirmed':True},
 'production':{'simulationId':None,'source':'Production fictive QA','nature':'assumption'}}
def request(payload=None):
 p=copy.deepcopy(payload or PAYLOAD)
 return {'schema_version':'1.0','engine':'finance','engine_version':'1.0.0','simulation_id':'finance-qa',
 'input_data':{'finance_payload':{'value':json.dumps(p),'unit':'-','nature':'external','source':p['evidence']['reference']}},
 'source_references':[{'label':p['evidence']['reference']}],'assumptions':{},'timeseries':None}
def run(p=None):return FinanceEngine().run(SimulationRequest.model_validate(request(p)))
def test_independent_closed_form_values():
 r=run().metadata['report']['result']
 assert r['lcoePerKwh']==pytest.approx(0.15)
 assert r['npv']==1000
 assert r['simplePaybackYears']==5
 assert r['rows'][1]['net']==200

def test_annuity_npv():
 p=copy.deepcopy(PAYLOAD);p['input']['realDiscountRatePct']=10;p['input']['saleTariffPerKwh']=0.2;p['input']['opexItems'][0]['amount']=0
 assert run(p).metadata['report']['result']['npv']==pytest.approx(228.91342,abs=1e-5)

def test_irr_known_root():assert irr([-1000,1100])['ratePct']==pytest.approx(10,abs=1e-6)
def test_multiple_irr_unavailable():assert irr([-100,230,-132])['status']=='unavailable'
def test_subsidy_does_not_change_lcoe():
 p=copy.deepcopy(PAYLOAD);p['input']['subsidy']=400
 r=run(p).metadata['report']['result'];assert r['lcoePerKwh']==0.15;assert r['npv']==1400

@pytest.mark.parametrize('mutate',[
 lambda p:p['input']['capexItems'][0].update(amount=''),
 lambda p:p['input']['opexItems'][0].update(amount=None),
 lambda p:p['input']['capexItems'][0].update(source='  '),
 lambda p:p['evidence'].update(date='2026-02-30'),
 lambda p:p['evidence'].update(costsConfirmed=False),
 lambda p:p['input'].update(soldShare=0.8,substitutedShare=0.3),
 lambda p:p['input'].update(saleTariffPerKwh=None),
 lambda p:p['input'].update(replacements=[{'year':11,'cost':10}]),
 lambda p:p['input'].update(opexItems=[]),
 lambda p:p['input'].update(yearOneProductionKwh=True),
])
def test_missing_or_undocumented_inputs_refused(mutate):
 p=copy.deepcopy(PAYLOAD);mutate(p)
 errors,_=FinanceEngine().validate(SimulationRequest.model_validate(request(p)))
 assert errors

def test_sensitivity_preserves_base_and_bounds():
 p=copy.deepcopy(PAYLOAD);p['sensitivity']={'variable':'capex','deltasPct':[-10,0,10]};before=copy.deepcopy(p)
 r=run(p).metadata['report'];assert p==before;assert r['sensitivity'][0]['npv']==1100;assert r['sensitivity'][2]['npv']==900
 p['sensitivity']['deltasPct']=[91]
 assert FinanceEngine().validate(SimulationRequest.model_validate(request(p)))[0]

def test_excluded_cost_not_double_counted():
 p=copy.deepcopy(PAYLOAD);p['input']['capexItems'].append({'label':'Inclus QA','amount':100,'source':'Devis fictif','includedInOther':True})
 assert run(p).metadata['report']['result']['totalCapex']==1000

def test_overflow_no_partial_result():
 p=copy.deepcopy(PAYLOAD);p['input']['realDiscountRatePct']=-99.99999999;p['input']['lifetimeYears']=100
 with pytest.raises(ValueError):run(p)

def test_api_auth_and_report(client):
 assert client.post('/api/v1/simulations',json=request()).status_code==401
 response=client.post('/api/v1/simulations',json=request(),headers=H)
 assert response.status_code==200
 body=response.json();assert body['engine_version']=='1.0.0';assert body['results']['lcoe']['value']==0.15
 assert body['calculation_metadata']['payload']==PAYLOAD
 assert body['calculation_metadata']['report']['result']['npv']==1000

def test_lcoe_mode(client):
 p=copy.deepcopy(PAYLOAD);p['mode']='lcoe';p['input']={'currency':'XOF','lifetimeYears':10,'discountRatePct':0,'capex':1000,'annualOpex':50,'replacements':[],'yearOneProductionKwh':1000,'degradationPctPerYear':0}
 out=client.post('/api/v1/simulations',json=request(p),headers=H)
 assert out.status_code==200;assert out.json()['results']['lcoe']['value']==0.15
